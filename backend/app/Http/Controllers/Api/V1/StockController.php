<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand'])
            ->select('id', 'name', 'sku', 'purchase_price', 'selling_price',
                     'current_stock', 'min_stock', 'category_id', 'brand_id');

        if ($request->get('low_stock_only')) {
            $query->whereColumn('current_stock', '<=', 'min_stock');
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('current_stock')->get()
        ]);
    }

    public function movements(Request $request)
    {
        $query = StockMovement::with('product')
            ->orderBy('date', 'desc');

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        return response()->json([
            'success' => true,
            'data' => $query->paginate(50)
        ]);
    }

    public function adjust(Request $request)
    {
        $request->validate([
            'product_id' => 'required|string|exists:products,id',
            'quantity' => 'required|integer|min:0',
            'type' => 'required|in:in,out,adjust',
            'reason' => 'nullable|string',
        ]);

        $product = Product::findOrFail($request->product_id);

        DB::transaction(function () use ($request, $product) {
            $qty = (int)$request->quantity;

            if ($request->type === 'in') {
                $product->increment('current_stock', $qty);
            } elseif ($request->type === 'out') {
                $product->decrement('current_stock', $qty);
            } else {
                $product->update(['current_stock' => $qty]);
            }

            StockMovement::create([
                'id' => 'mvmt-' . Str::uuid(),
                'product_id' => $product->id,
                'quantity' => $qty,
                'type' => $request->type,
                'reason' => $request->reason ?? 'Manual Adjustment',
                'date' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted successfully',
            'data' => $product->fresh()
        ]);
    }
}
