<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('covenants', function (Blueprint $table) {
            $table->id();
            $table->string('covenant_code', 20)->unique();
            $table->string('employee_name');
            $table->string('phone')->nullable();
            $table->date('registration_date')->nullable();
            $table->string('document_number')->nullable();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('payment_method')->nullable();
            $table->text('statement')->nullable();
            $table->timestamps();

            $table->index('employee_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('covenants');
    }
};
