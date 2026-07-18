<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Delivery;
use App\Models\Expense;
use App\Models\StockMovement;
use App\Models\ProductVariant;
use App\Models\OfflineSyncLog;
use Illuminate\Support\Str;

class SyncController extends Controller
{
    /**
     * Pull latest catalogue details for local database.
     */
    public function pull(Request $request)
    {
        $since = $request->query('since');

        $query = function($model) use ($since) {
            return $since ? $model::where('updated_at', '>', $since)->get() : $model::all();
        };

        return response()->json([
            'success' => true,
            'data' => [
                'products' => $query(Product::class),
                'product_variants' => $query(ProductVariant::class),
                'categories' => Category::all(), // small table, send all
                'brands' => Brand::all(),       // small table, send all
                'customers' => $query(Customer::class),
                'suppliers' => $query(Supplier::class)
            ]
        ]);
    }

    /**
     * Handle single client queue sync operation with conflict resolution.
     */
    public function push(Request $request)
    {
        $request->validate([
            'table' => 'required|string',
            'action' => 'required|string',
            'payload' => 'required|array'
        ]);

        $table = $request->input('table');
        $action = $request->input('action');
        $payload = $request->input('payload');
        $clientId = $payload['id'] ?? null;

        try {
            $result = DB::transaction(function () use ($table, $action, $payload, $clientId, $request) {
                
                // Get corresponding Eloquent Model
                $modelClass = $this->getModelClass($table);
                if (!$modelClass) {
                    throw new \Exception("Table {$table} not supported for synchronization.");
                }

                // 1. Conflict Resolution (Updated At check)
                if ($action === 'update' && $clientId) {
                    $serverRecord = $modelClass::find($clientId);
                    if ($serverRecord) {
                        $clientUpdatedAt = $payload['updated_at'] ?? null;
                        $serverUpdatedAt = $serverRecord->updated_at->toISOString();

                        // If server is newer than client, trigger conflict error
                        if ($clientUpdatedAt && $serverUpdatedAt > $clientUpdatedAt) {
                            return [
                                'success' => false,
                                'conflict' => true,
                                'server_record' => $serverRecord,
                                'message' => 'Conflict: Server record is newer than local edit.'
                            ];
                        }
                    }
                }

                // 2. Perform database operation
                $record = null;
                $oldId = null;
                $newId = null;

                if ($action === 'create' || $action === 'update') {
                    // Check if record exists
                    $existing = $clientId ? $modelClass::find($clientId) : null;

                    if ($table === 'orders' && $action === 'create') {
                        // Custom logic to handle order items creation
                        $record = $this->syncOrder($payload);
                    } else if ($table === 'stock_movements' && $action === 'create') {
                        $record = $this->syncStockMovement($payload);
                    } else {
                        // Standard Model insert/update
                        $cleanPayload = $this->filterPayload($modelClass, $payload);
                        
                        if ($existing) {
                            $existing->update($cleanPayload);
                            $record = $existing;
                        } else {
                            // If ID is local UUID, generate new server UUID or retain client UUID (highly recommended for offline keys)
                            if (Str::startsWith($clientId, ['local-', 'cust-', 'exp-', 'supp-', 'var-', 'mvmt-', 'ord-'])) {
                                $oldId = $clientId;
                                // Convert temp local prefix to real UUID or clean ID
                                $cleanPayload['id'] = Str::uuid()->toString();
                                $newId = $cleanPayload['id'];
                            }
                            $record = $modelClass::create($cleanPayload);
                        }
                    }
                } else if ($action === 'delete' && $clientId) {
                    $existing = $modelClass::find($clientId);
                    if ($existing) {
                        $existing->delete();
                    }
                }

                // Write sync log
                OfflineSyncLog::create([
                    'client_ip' => $request->ip(),
                    'table_name' => $table,
                    'records_synced' => 1,
                    'status' => 'success'
                ]);

                return [
                    'success' => true,
                    'data' => [
                        'old_id' => $oldId,
                        'new_id' => $newId,
                        'record' => $record
                    ]
                ];
            });

            return response()->json($result);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Sync error: ' . $e->getMessage(), ['exception' => $e]);
            OfflineSyncLog::create([
                'client_ip' => $request->ip(),
                'table_name' => $table,
                'records_synced' => 0,
                'status' => 'failed'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sync transaction failed: ' . $e->getMessage()
            ], 500);
        }
    }

    private function getModelClass($table)
    {
        $map = [
            'products' => Product::class,
            'product_variants' => ProductVariant::class,
            'orders' => Order::class,
            'customers' => Customer::class,
            'suppliers' => Supplier::class,
            'expenses' => Expense::class,
            'stock_movements' => StockMovement::class,
        ];
        return $map[$table] ?? null;
    }

    private function filterPayload($modelClass, $payload)
    {
        // Filter out relationships or custom attributes not present in DB
        $model = new $modelClass();
        $fillable = $model->getFillable();
        // Always include ID
        $fillable[] = 'id';
        return array_intersect_key($payload, array_flip($fillable));
    }

    private function syncOrder($payload)
    {
        // 1. Save main order
        $order = Order::create([
            'id' => $payload['id'],
            'customer_id' => $payload['customer_id'],
            'customer_name' => $payload['customer_name'],
            'subtotal' => $payload['subtotal'],
            'discount' => $payload['discount'] ?? 0,
            'delivery_fee' => $payload['delivery_fee'] ?? 0,
            'total_amount' => $payload['total_amount'],
            'deposit_amount' => $payload['deposit_amount'] ?? 0,
            'remaining_amount' => $payload['remaining_amount'] ?? 0,
            'payment_status' => $payload['payment_status'],
            'payment_method' => $payload['payment_method'],
            'date' => $payload['date'],
        ]);

        // 2. Save items
        if (!empty($payload['items'])) {
            foreach ($payload['items'] as $item) {
                OrderItem::create([
                    'id' => $item['id'] ?? 'item-' . Str::uuid(),
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'name' => $item['name'],
                    'sku' => $item['sku'],
                    'quantity' => $item['quantity'],
                    'selling_price' => $item['selling_price'],
                    'purchase_price' => $item['purchase_price'],
                    'size' => $item['attributes']['Size'] ?? ($item['size'] ?? null),
                    'color' => $item['attributes']['Color'] ?? ($item['color'] ?? null),
                ]);
            }
        }

        // 3. Save delivery
        if (!empty($payload['delivery'])) {
            Delivery::create([
                'id' => $payload['delivery']['id'] ?? 'del-' . Str::uuid(),
                'order_id' => $order->id,
                'company' => $payload['delivery']['company'],
                'fee' => $payload['delivery']['fee'] ?? 0,
                'status' => $payload['delivery']['status'] ?? 'pending',
                'tracking_number' => $payload['delivery']['tracking_number'] ?? null,
            ]);
        }

        return $order->load(['items', 'delivery']);
    }

    private function syncStockMovement($payload)
    {
        $variantId = $payload['variant_id'] ?? null;
        $productId = $payload['product_id'] ?? null;

        // If frontend only provided variant_id, lookup the product_id to satisfy DB constraint
        if (!$productId && $variantId) {
            $variant = ProductVariant::find($variantId);
            if ($variant) {
                $productId = $variant->product_id;
            }
        }

        $movement = StockMovement::create([
            'id' => $payload['id'],
            'product_id' => $productId,
            'variant_id' => $variantId,
            'quantity' => $payload['quantity'],
            'type' => $payload['type'],
            'reason' => $payload['reason'] ?? null,
            'date' => $payload['date'],
        ]);

        // Adjust stock on variant if variant_id is provided
        $variantId = $payload['variant_id'] ?? null;
        if ($variantId) {
            $variant = ProductVariant::find($variantId);
            if ($variant) {
                $qty = (int)$payload['quantity'];
                if ($payload['type'] === 'in') {
                    $variant->increment('stock_quantity', $qty);
                } else if ($payload['type'] === 'out') {
                    $variant->decrement('stock_quantity', $qty);
                } else if ($payload['type'] === 'adjust') {
                    $variant->update(['stock_quantity' => $qty]);
                }
            }
        } else {
            // Fallback: adjust product-level stock (legacy)
            $product = Product::find($payload['product_id']);
            if ($product) {
                $qty = (int)$payload['quantity'];
                if ($payload['type'] === 'in') {
                    $product->increment('current_stock', $qty);
                } else if ($payload['type'] === 'out') {
                    $product->decrement('current_stock', $qty);
                } else if ($payload['type'] === 'adjust') {
                    $product->update(['current_stock' => $qty]);
                }
            }
        }

        return $movement;
    }
}
