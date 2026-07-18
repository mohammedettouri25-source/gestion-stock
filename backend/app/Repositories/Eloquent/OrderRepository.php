<?php

namespace App\Repositories\Eloquent;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Delivery;
use App\Repositories\Contracts\OrderRepositoryInterface;
use Illuminate\Support\Facades\DB;

class OrderRepository implements OrderRepositoryInterface
{
    public function all()
    {
        return Order::with(['items', 'delivery'])->orderBy('date', 'desc')->get();
    }

    public function find(string $id)
    {
        return Order::with(['items', 'delivery'])->findOrFail($id);
    }

    public function create(array $data)
    {
        return DB::transaction(function () use ($data) {
            $order = Order::create([
                'id' => $data['id'],
                'customer_id' => $data['customer_id'],
                'customer_name' => $data['customer_name'],
                'subtotal' => $data['subtotal'],
                'discount' => $data['discount'] ?? 0,
                'delivery_fee' => $data['delivery_fee'] ?? 0,
                'total_amount' => $data['total_amount'],
                'deposit_amount' => $data['deposit_amount'] ?? 0,
                'remaining_amount' => $data['remaining_amount'] ?? 0,
                'payment_status' => $data['payment_status'],
                'payment_method' => $data['payment_method'],
                'date' => $data['date'],
            ]);

            // Save items
            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    OrderItem::create([
                        'id' => $item['id'] ?? 'item-' . \Illuminate\Support\Str::uuid(),
                        'order_id' => $order->id,
                        'product_id' => $item['product_id'],
                        'name' => $item['name'],
                        'sku' => $item['sku'],
                        'quantity' => $item['quantity'],
                        'selling_price' => $item['selling_price'],
                        'purchase_price' => $item['purchase_price'],
                        'size' => $item['size'] ?? null,
                        'color' => $item['color'] ?? null,
                    ]);
                }
            }

            // Save delivery logs if any
            if (!empty($data['delivery'])) {
                Delivery::create([
                    'id' => $data['delivery']['id'] ?? 'del-' . \Illuminate\Support\Str::uuid(),
                    'order_id' => $order->id,
                    'company' => $data['delivery']['company'],
                    'fee' => $data['delivery']['fee'] ?? 0,
                    'status' => $data['delivery']['status'] ?? 'pending',
                    'tracking_number' => $data['delivery']['tracking_number'] ?? null,
                ]);
            }

            return $order->load(['items', 'delivery']);
        });
    }

    public function getRecentSales(int $limit)
    {
        return Order::orderBy('date', 'desc')->limit($limit)->get();
    }
}
