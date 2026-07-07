<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AutoCoachReferenceVideo extends Model
{
    protected $table = 'autocoach_reference_videos';

    protected $fillable = [
        'sport',
        'posture',
        'trick',
        'file_path',
    ];
}
