<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PagoCuotaQueueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => trim(($this->user?->nombre ?? '').' '.($this->user?->apellido ?? '')),
            'email' => $this->user?->email,
            'phone' => $this->user?->telefono,
            'numeroTaquilla' => $this->user?->numeroTaquilla,
            'plan' => $this->plan?->nombre,
            'status' => $this->status,
            'amount' => (float) $this->monto_pagado,
            'periodo_inicio' => optional($this->periodo_inicio)->toDateString(),
            'periodo_fin' => optional($this->periodo_fin)->toDateString(),
            'vencimiento_usuario' => optional($this->user?->fecha_vencimiento_cuota)->toDateString(),
            'proof_url' => ! empty($this->payment_proof_path) ? route('taquilla.pagos.proof', $this->id) : null,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}

