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
        Schema::create('product_variants', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('product_id');
            $table->string('sku')->nullable();
            $table->string('barcode')->nullable();
            $table->decimal('purchase_price', 10, 2)->default(0);
            $table->decimal('selling_price', 10, 2)->default(0);
            $table->integer('stock_quantity')->default(0);
            $table->integer('min_stock')->default(5);
            $table->json('attributes')->nullable(); // { Color: 'Black', Size: 'M' }
            $table->string('status')->default('Active'); // Active, Inactive
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->index(['product_id', 'sku', 'barcode']);
        });

        // Update stock_movements to reference variant_id instead of (or in addition to) product_id
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('variant_id')->nullable()->after('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn('variant_id');
        });

        Schema::dropIfExists('product_variants');
    }
};
