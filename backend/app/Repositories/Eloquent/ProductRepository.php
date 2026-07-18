<?php

namespace App\Repositories\Eloquent;

use App\Models\Product;
use App\Repositories\Contracts\ProductRepositoryInterface;

class ProductRepository implements ProductRepositoryInterface
{
    public function all()
    {
        return Product::with(['category', 'brand'])->get();
    }

    public function find(string $id)
    {
        return Product::with(['category', 'brand'])->findOrFail($id);
    }

    public function create(array $data)
    {
        return Product::create($data);
    }

    public function update(string $id, array $data)
    {
        $product = Product::findOrFail($id);
        $product->update($data);
        return $product;
    }

    public function delete(string $id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return true;
    }

    public function getLowStock(int $limit)
    {
        return Product::whereColumn('current_stock', '<=', 'min_stock')->limit($limit)->get();
    }
}
