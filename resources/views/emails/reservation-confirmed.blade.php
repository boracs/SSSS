<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reserva confirmada · S4</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #0d234d;">¡Todo listo!</h1>
    <p>¡Todo listo, {{ $enrollment->user->nombre ?? $enrollment->user->name ?? 'alumno' }}! Tu pago ha sido validado.</p>
    <p>Nos vemos en el agua el día <strong>{{ \Carbon\Carbon::parse($lesson->starts_at)->format('d/m/Y') }}</strong> a las <strong>{{ \Carbon\Carbon::parse($lesson->starts_at)->format('H:i') }}</strong>.</p>
    <p>Recuerda traer ganas de surfear. 🌊</p>
    <p style="margin-top: 24px; font-size: 14px; color: #64748b;">San Sebastian Surf School · S4</p>
</body>
</html>
