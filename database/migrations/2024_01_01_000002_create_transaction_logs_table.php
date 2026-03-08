<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_logs', function (Blueprint $table) {
            $table->id();
            $table->timestamp('logged_at')->useCurrent();
            $table->date('transaction_date')->nullable();
            $table->string('item_code', 20);
            $table->string('item_name');
            $table->string('transaction_type');
            $table->decimal('quantity', 15, 2)->default(0);
            $table->decimal('previous_stock', 15, 2)->default(0);
            $table->decimal('new_stock', 15, 2)->default(0);
            $table->string('supplier')->nullable();
            $table->decimal('price', 15, 2)->default(0);
            $table->string('document_type')->nullable();
            $table->string('document_number')->nullable();
            $table->text('notes')->nullable();
            $table->string('factory');

            $table->index('item_code');
            $table->index('factory');
            $table->index('transaction_type');
            $table->index('logged_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_logs');
    }
};
