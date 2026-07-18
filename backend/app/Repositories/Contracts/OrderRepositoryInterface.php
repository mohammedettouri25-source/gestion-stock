<?php

namespace App\Repositories\Contracts;

interface OrderRepositoryInterface
{
    public function all();
    public function find(string $id);
    public function create(array $data);
    public function getRecentSales(int $limit);
}
