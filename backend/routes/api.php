<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\DeliveryController;
use App\Http\Controllers\Api\V1\StockController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\SyncController;

// ─── API V1 Group ───────────────────────────────────────────────────────────
Route::prefix('v1')->group(function () {

    // ── Public Auth routes (no auth required) ──────────────────────────────
    Route::post('auth/login', [AuthController::class, 'login']);

    // ── Protected routes ───────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/profile', [AuthController::class, 'profile']);

        // ── Products ────────────────────────────────────────────────────────
        Route::apiResource('products', ProductController::class);

        // ── Orders ──────────────────────────────────────────────────────────
        Route::apiResource('orders', OrderController::class)->except(['update', 'destroy']);
        Route::patch('orders/{id}/status', [OrderController::class, 'updateStatus']);

        // ── Customers ───────────────────────────────────────────────────────
        Route::apiResource('customers', CustomerController::class);

        // ── Suppliers ───────────────────────────────────────────────────────
        Route::apiResource('suppliers', SupplierController::class);

        // ── Expenses ────────────────────────────────────────────────────────
        Route::get('expense-categories', [ExpenseController::class, 'categories']);
        Route::apiResource('expenses', ExpenseController::class)->except(['update']);

        // ── Stock Management ────────────────────────────────────────────────
        Route::get('stock', [StockController::class, 'index']);
        Route::get('stock/movements', [StockController::class, 'movements']);
        Route::post('stock/adjust', [StockController::class, 'adjust']);

        // ── Deliveries ──────────────────────────────────────────────────────
        Route::get('deliveries', [DeliveryController::class, 'index']);
        Route::patch('deliveries/{id}/status', [DeliveryController::class, 'updateStatus']);

        // ── Analytics / Reports ─────────────────────────────────────────────
        Route::get('analytics/dashboard', [AnalyticsController::class, 'dashboard']);
        Route::get('analytics/profit-loss', [AnalyticsController::class, 'profitLoss']);
        Route::get('analytics/inventory', [AnalyticsController::class, 'inventoryReport']);

        // ── Offline Synchronization ─────────────────────────────────────────
        Route::post('sync', [SyncController::class, 'push']);
        Route::get('sync/pull', [SyncController::class, 'pull']);
    });
});
