<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu plaza bloqueada · S4</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #0d234d;">Tu plaza en la cresta de la ola</h1>
    <p>Hola {{ $enrollment->user->nombre ?? $enrollment->user->name ?? 'alumno' }},</p>
    <p>Hemos bloqueado tu plaza en la cresta de la ola. Tienes <strong>3 horas</strong> para asegurar tu sitio.</p>
    <p style="margin: 20px 0;">
        <a href="{{ $profileUrl }}" style="display: inline-block; background: #0d234d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600;">Pagar ahora</a>
    </p>
    <p style="font-size: 14px; color: #64748b;">Bizum: {{ $bizumNumber }} · IBAN: {{ $iban }}</p>
    <p style="margin-top: 24px; font-size: 14px; color: #64748b;">San Sebastian Surf School · S4</p>
</body>
</html>
