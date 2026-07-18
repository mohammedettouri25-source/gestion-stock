<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'phone', 'email', 'outstanding_balance'
    ];

    protected $casts = [
        'outstanding_balance' => 'decimal:2'
    ];
}
