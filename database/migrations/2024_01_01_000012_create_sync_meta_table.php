<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_meta', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('value')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_meta');
    }
};
