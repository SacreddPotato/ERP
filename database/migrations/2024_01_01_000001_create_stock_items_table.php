<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_code', 20);
            $table->string('name');
            $table->string('category');
            $table->string('unit');
            $table->string('factory');
            $table->string('supplier')->nullable();
            $table->decimal('starting_balance', 15, 2)->default(0);
            $table->decimal('total_incoming', 15, 2)->default(0);
            $table->decimal('total_outgoing', 15, 2)->default(0);
            $table->decimal('net_stock', 15, 2)->default(0);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('min_stock', 15, 2)->default(0);
            $table->timestamp('last_updated')->nullable();
            $table->timestamps();

            $table->unique(['item_code', 'factory']);
            $table->index('factory');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_items');
    }
};
