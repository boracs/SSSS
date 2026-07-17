<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\ChatbotInteractionStatus;
use App\Http\Controllers\Controller;
use App\Models\ChatbotInteraction;
use App\Services\Chatbot\ChatbotContactPhoneService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Panel admin de casos derivados del chatbot (patrón hostil o incertidumbre repetida).
 */
final class ChatbotInteractionController extends Controller
{
    public function __construct(
        private readonly ChatbotContactPhoneService $contactPhones,
    ) {}

    public function index(Request $request): Response
    {
        $status = (string) $request->query('status', ChatbotInteractionStatus::REQUIRES_HUMAN->value);
        $validStatuses = array_map(fn (ChatbotInteractionStatus $s) => $s->value, ChatbotInteractionStatus::cases());
        if (! in_array($status, $validStatuses, true)) {
            $status = ChatbotInteractionStatus::REQUIRES_HUMAN->value;
        }

        $interactions = ChatbotInteraction::query()
            ->with('user:id,nombre,apellido,email,telefono')
            ->where('status', $status)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (ChatbotInteraction $i) => [
                'id' => $i->id,
                'case_reference' => $i->case_reference,
                'status' => $i->status->value,
                'status_label' => $i->status->label(),
                'flag_reason' => $i->flag_reason,
                'ip_address' => $i->ip_address,
                'contact_phone' => $i->contact_phone_display,
                'whatsapp_reply_url' => $this->contactPhones->adminReplyWhatsappUrl($i),
                'history' => $i->history,
                'user' => $i->user ? [
                    'name' => trim("{$i->user->nombre} {$i->user->apellido}") ?: $i->user->email,
                    'email' => $i->user->email,
                    'telefono' => $i->user->telefono,
                ] : null,
                'created_at' => $i->created_at?->diffForHumans(),
            ]);

        return Inertia::render('Admin/Chatbot/Index', [
            'interactions' => $interactions,
            'status' => $status,
            'statusOptions' => collect(ChatbotInteractionStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
        ]);
    }

    public function resolve(ChatbotInteraction $chatbotInteraction): RedirectResponse
    {
        $chatbotInteraction->update([
            'status' => ChatbotInteractionStatus::RESOLVED,
            'resolved_at' => now(),
        ]);

        return back()->with('success', "Caso {$chatbotInteraction->case_reference} marcado como resuelto.");
    }
}
