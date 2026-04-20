<?php

namespace Tests\Unit;

use App\Support\BusinessDateTime;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BusinessDateTimeTest extends TestCase
{
    #[Test]
    public function to_api_mantiene_hora_de_pared_con_offset_madrid(): void
    {
        config(['services.academy.business_timezone' => 'Europe/Madrid']);

        $wall = Carbon::parse('2026-04-02 10:00:00', 'Europe/Madrid');
        $api = BusinessDateTime::toApi($wall);

        $this->assertStringStartsWith('2026-04-02T10:00:00', $api);
        $this->assertMatchesRegularExpression('/[+-]\d{2}:\d{2}$/', $api);
        // 2 abr 2026: horario de verano en España (CEST, +02:00)
        $this->assertStringEndsWith('+02:00', $api);
    }

    #[Test]
    public function parse_in_app_timezone_interpreta_sin_desplazar_a_utc_en_salida(): void
    {
        config(['services.academy.business_timezone' => 'Europe/Madrid']);

        $parsed = BusinessDateTime::parseInAppTimezone('2026-04-02 10:00:00');
        $this->assertSame('2026-04-02 10:00:00', $parsed->format('Y-m-d H:i:s'));
        $this->assertSame('Europe/Madrid', $parsed->timezone->getName());
    }

    #[Test]
    public function parse_modal_commander_con_t_es_hora_de_pared(): void
    {
        config(['services.academy.business_timezone' => 'Europe/Madrid']);
        $parsed = BusinessDateTime::parseInAppTimezone('2026-04-02T10:00:00');
        $this->assertSame('2026-04-02 10:00:00', $parsed->format('Y-m-d H:i:s'));
    }

    #[Test]
    public function lesson_serialize_date_usa_api_negocio(): void
    {
        config(['services.academy.business_timezone' => 'Europe/Madrid', 'app.timezone' => 'UTC']);

        // Fila naive 10:00 = Madrid; APP_TIMEZONE=UTC no debe desplazar la hora al leer.
        $lesson = new \App\Models\Lesson;
        $lesson->starts_at = '2026-04-02 10:00:00';

        $arr = $lesson->toArray();
        $this->assertStringStartsWith('2026-04-02T10:00:00', (string) ($arr['starts_at'] ?? ''));
    }
}
