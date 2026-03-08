<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_configs', function (Blueprint $table) {
            $table->id();
            $table->boolean('initialized')->default(false);
            $table->decimal('starting_capital', 15, 2)->default(0);
            $table->timestamp('initialization_date')->nullable();
            $table->date('fiscal_year_start')->nullable();
            $table->string('currency', 10)->default('EGP');
            $table->text('notes')->nullable();
            $table->timestamp('last_updated')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_configs');
    }
};
