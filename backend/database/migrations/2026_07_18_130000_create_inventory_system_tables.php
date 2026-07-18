<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Categories
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        // 2. Brands
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        // 3. Sizes
        Schema::create('sizes', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // S, M, L, XL, XXL
            $table->timestamps();
        });

        // 4. Colors
        Schema::create('colors', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Black, White, Grey, Navy
            $table->timestamps();
        });

        // 5. Products (uses string/UUID ID to prevent collisions during client sync)
        Schema::create('products', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('sku')->unique();
            $table->string('barcode')->unique();
            $table->decimal('purchase_price', 10, 2);
            $table->decimal('selling_price', 10, 2);
            $table->integer('current_stock')->default(0);
            $table->integer('min_stock')->default(5);
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->json('sizes')->nullable();
            $table->json('colors')->nullable();
            $table->timestamps();
            
            // Add index for performance search
            $table->index(['name', 'sku', 'barcode']);
        });

        // 6. Product Images
        Schema::create('product_images', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('product_id');
            $table->string('image_path');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });

        // 7. Stocks (current cached levels)
        Schema::create('stocks', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('product_id');
            $table->integer('quantity')->default(0);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });

        // 8. Stock Movements
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('product_id');
            $table->integer('quantity');
            $table->string('type'); // in, out, adjust
            $table->string('reason')->nullable();
            $table->timestamp('date');
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });

        // 9. Customers
        Schema::create('customers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->decimal('outstanding_balance', 10, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 10. Suppliers
        Schema::create('suppliers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->decimal('outstanding_balance', 10, 2)->default(0.00);
            $table->timestamps();
        });

        // 11. Orders
        Schema::create('orders', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('customer_id');
            $table->string('customer_name');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('discount', 10, 2)->default(0.00);
            $table->decimal('delivery_fee', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);
            $table->decimal('deposit_amount', 10, 2)->default(0.00);
            $table->decimal('remaining_amount', 10, 2)->default(0.00);
            $table->string('payment_status'); // paid, partially_paid, unpaid
            $table->string('payment_method'); // cash, card, bank_transfer
            $table->timestamp('date');
            $table->timestamps();

            $table->index(['customer_id', 'payment_status', 'date']);
        });

        // 12. Order Items
        Schema::create('order_items', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('order_id');
            $table->string('product_id');
            $table->string('name');
            $table->string('sku');
            $table->integer('quantity');
            $table->decimal('selling_price', 10, 2);
            $table->decimal('purchase_price', 10, 2);
            $table->string('size')->nullable();
            $table->string('color')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });

        // 13. Payments
        Schema::create('payments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('order_id');
            $table->decimal('amount', 10, 2);
            $table->string('payment_method');
            $table->timestamp('date');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });

        // 14. Expense Categories
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Rent, Salaries, Electricity, Internet, Marketing, Transport, Other
            $table->timestamps();
        });

        // 15. Expenses
        Schema::create('expenses', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('category_id')->constrained('expense_categories')->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->string('description')->nullable();
            $table->date('date');
            $table->timestamps();
        });

        // 16. Deliveries
        Schema::create('deliveries', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('order_id');
            $table->string('company');
            $table->decimal('fee', 10, 2)->default(0.00);
            $table->string('status'); // pending, shipped, delivered, cancelled
            $table->string('tracking_number')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });

        // 17. Financial Transactions
        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('type'); // income, expense
            $table->decimal('amount', 10, 2);
            $table->string('source'); // sales, rent, salary, etc.
            $table->date('date');
            $table->timestamps();
        });

        // 18. Activity Logs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('action');
            $table->text('details')->nullable();
            $table->timestamps();
        });

        // 19. Notifications
        Schema::create('notifications', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('title');
            $table->text('content');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });

        // 20. Offline Sync Logs
        Schema::create('offline_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('client_ip')->nullable();
            $table->string('table_name');
            $table->integer('records_synced');
            $table->string('status'); // success, failed
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offline_sync_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stocks');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
        Schema::dropIfExists('colors');
        Schema::dropIfExists('sizes');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('categories');
    }
};
