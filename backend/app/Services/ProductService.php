<?php

namespace App\Services;

use App\Repositories\Contracts\ProductRepositoryInterface;
use App\Models\Product;

class ProductService
{
    protected $productRepository;

    public function __construct(ProductRepositoryInterface $productRepository)
    {
        $this->productRepository = $productRepository;
    }

    public function getAll($filters = [])
    {
        return $this->productRepository->getAll($filters);
    }

    public function findById($id)
    {
        return $this->productRepository->findById($id);
    }

    public function create(array $data)
    {
        if (empty($data['sku'])) {
            $data['sku'] = $this->generateSKU($data);
        }
        if (empty($data['barcode'])) {
            $data['barcode'] = $this->generateBarcode();
        }
        
        return $this->productRepository->create($data);
    }

    public function update($id, array $data)
    {
        return $this->productRepository->update($id, $data);
    }

    public function delete($id)
    {
        return $this->productRepository->delete($id);
    }

    private function generateSKU($data)
    {
        $prefix = strtoupper(substr($data['name'] ?? 'PRD', 0, 3));
        return $prefix . '-' . time();
    }

    private function generateBarcode()
    {
        return rand(100000000000, 999999999999);
    }
}
