<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reserva confirmada · S4</title>
</head>
<body style="margin:0;background:#f0f9ff;font-family:Arial,sans-serif;color:#0f172a;">
    @php
        $startsAt = \Carbon\Carbon::parse($lesson->starts_at)->timezone(config('app.timezone'));
        $dateHuman = $startsAt->locale('es')->translatedFormat('l, d \\d\\e F');
        $timeHuman = $startsAt->format('H:i');
        $name = $user->nombre ?? $user->name ?? 'surfista';
        $mapsUrl = $googleMapsUrl;
    @endphp

    <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
        <div style="background:linear-gradient(135deg,#e0f2fe,#ecfeff);border:1px solid #bae6fd;border-radius:18px;padding:20px;">
            <div style="display:inline-block;background:#0ea5e9;color:#fff;font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px;">PAGO VALIDADO</div>
            <h1 style="margin:14px 0 8px;color:#0c4a6e;font-size:26px;line-height:1.2;">¡Reserva Confirmada, {{ $name }}! 🏄‍♂️</h1>
            <p style="margin:0;color:#155e75;font-size:15px;">Tu plaza está confirmada y ya está todo listo para tu sesión.</p>
        </div>

        <div style="margin-top:16px;background:#ffffff;border:1px solid #dbeafe;border-radius:14px;padding:16px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#0369a1;text-transform:uppercase;">Detalle de tu clase</div>
            <p style="margin:10px 0 0;font-size:15px;color:#0f172a;"><strong>Clase:</strong> {{ $lesson->title ?: 'Clase de Surf' }}</p>
            <p style="margin:6px 0 0;font-size:15px;color:#0f172a;"><strong>Fecha:</strong> {{ ucfirst($dateHuman) }}</p>
            <p style="margin:6px 0 0;font-size:15px;color:#0f172a;"><strong>Hora:</strong> {{ $timeHuman }}</p>
            <p style="margin:6px 0 0;font-size:15px;color:#0f172a;"><strong>Nivel:</strong> {{ ucfirst($lesson->level ?? 'General') }}</p>
        </div>

        <a href="{{ $mapsUrl }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:16px;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;padding:12px 16px;border-radius:12px;box-shadow:0 8px 18px rgba(234,88,12,.28);">
            📍 Cómo llegar a la Escuela
        </a>

        <div style="margin-top:16px;background:#ffffff;border:1px solid #cffafe;border-radius:14px;padding:16px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#0e7490;text-transform:uppercase;">Checklist de valor</div>
            <p style="margin:10px 0 0;color:#0f172a;">No olvides tu kit:</p>
            <p style="margin:6px 0 0;color:#0f172a;">🩳 Bañador</p>
            <p style="margin:4px 0 0;color:#0f172a;">🧴 Crema solar</p>
            <p style="margin:4px 0 0;color:#0f172a;">🧖‍♂️ Toalla</p>
        </div>

        <p style="margin:18px 2px 0;color:#475569;font-size:13px;">Equipo S4 · Confirmación automática de reserva</p>
    </div>
</body>
</html>
