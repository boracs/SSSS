<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PagoCuota extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_REJECTED = 'rejected';

    protected $table = 'pagos_cuotas';

    protected $fillable = [
        'user_id',
        'id_plan_pagado',
        'monto_pagado_cents',
        'referencia_pago_externa',
        'status',
        'is_checked',
        'payment_proof_path',
        'proof_uploaded_at',
        'reviewed_at',
        'payment_method',
        'admin_notes',
        'periodo_inicio',
        'periodo_fin',
        'fecha_pago',
    ];

    protected $casts = [
        'periodo_inicio' => 'datetime',
        'periodo_fin' => 'datetime',
        'fecha_pago' => 'datetime',
        'proof_uploaded_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'is_checked' => 'boolean',
        'monto_pagado_cents' => 'integer',
    ];

    protected function montoPagado(): Attribute
    {
        return Attribute::make(
            get: fn (): float => MoneyCents::centsToEuros((int) ($this->monto_pagado_cents ?? 0)),
        );
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function plan()
    {
        return $this->belongsTo(PlanTaquilla::class, 'id_plan_pagado');
    }

    public function getDuracionDiasAttribute(): int
    {
        return $this->periodo_inicio && $this->periodo_fin
            ? (int) $this->periodo_inicio->diffInDays($this->periodo_fin)
            : 0;
    }
}
