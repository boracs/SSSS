<?php

declare(strict_types=1);

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
            'payment_method' => $this->payment_method,
            'is_checked' => (bool) ($this->is_checked ?? false),
            'admin_notes' => $this->admin_notes,
            'amount' => $this->monto_pagado,
            'periodo_inicio' => optional($this->periodo_inicio)->toDateString(),
            'periodo_fin' => optional($this->periodo_fin)->toDateString(),
            'vencimiento_usuario' => optional($this->user?->fecha_vencimiento_cuota)->toDateString(),
            'proof_url' => ! empty($this->payment_proof_path) ? route('taquilla.pagos.proof', $this->id) : null,
            'created_at' => optional($this->created_at)->toIso8601String(),
            'created_at_human' => $this->created_at
                ? ($this->created_at->isToday()
                    ? 'Hoy a las '.$this->created_at->format('H:i')
                    : $this->created_at->format('d/m/Y H:i'))
                : null,
            'proof_uploaded_at' => optional($this->proof_uploaded_at)->toIso8601String(),
            'proof_uploaded_at_human' => $this->proof_uploaded_at
                ? ($this->proof_uploaded_at->isToday()
                    ? 'Hoy a las '.$this->proof_uploaded_at->format('H:i')
                    : $this->proof_uploaded_at->format('d/m/Y H:i'))
                : null,
            'reviewed_at' => optional($this->reviewed_at)->toIso8601String(),
            'is_new' => $this->reviewed_at === null,
        ];
    }
}

