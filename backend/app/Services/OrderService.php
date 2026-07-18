<?php

namespace App\Services;

use App\Repositories\Contracts\OrderRepositoryInterface;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

class OrderService
{
    protected $orderRepository;

    public function __construct(OrderRepositoryInterface $orderRepository)
    {
        $this->orderRepository = $orderRepository;
    }

    public function createOrder(array $data)
    {
        return DB::transaction(function () use ($data) {
            $order = $this->orderRepository->create($data);

            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $order->items()->create($item);
                }
            }

            return $order->load('items');
        });
    }

    public function getOrders($filters = [])
    {
        return $this->orderRepository->getAll($filters);
    }

    public function findById($id)
    {
        return $this->orderRepository->findById($id);
    }

    public function updateStatus($id, $status)
    {
        return $this->orderRepository->update($id, ['payment_status' => $status]);
    }
}
