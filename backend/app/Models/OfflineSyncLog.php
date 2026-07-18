<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfflineSyncLog extends Model
{
    protected $fillable = [
        'client_ip', 'table_name', 'records_synced', 'status'
    ];
}
