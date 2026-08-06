<?php

declare(strict_types=1);

namespace Tests\Unit\SurfConditions;

use App\Services\SurfConditions\EuskalmetSeaForecastClient;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class EuskalmetSeaForecastClientTest extends TestCase
{
    #[Test]
    public function parses_official_tide_minutes_from_sea_forecast_xml(): void
    {
        $xml = <<<'XML'
<?xml version='1.0' encoding='ISO-8859-1'?>
<day month='8' day='4' done='04/08/2026 [07:34:43]'>
  <forecasts>
    <forecast periodName='today' periodDate='04/08/2026'>
      <firstLowTideTime><![CDATA[01/08/2026 [00:53:00]]]></firstLowTideTime>
      <firstLowTide>1.22</firstLowTide>
      <firstHighTideTime><![CDATA[01/08/2026 [07:02:00]]]></firstHighTideTime>
      <firstHighTide>3.95</firstHighTide>
      <secondLowTideTime><![CDATA[01/08/2026 [13:08:00]]]></secondLowTideTime>
      <secondLowTide>1.38</secondLowTide>
      <secondHighTideTime><![CDATA[01/08/2026 [19:23:00]]]></secondHighTideTime>
      <secondHighTide>4.11</secondHighTide>
      <waveHeight>0.3</waveHeight>
      <waterTemperature>24</waterTemperature>
      <visibility>superior a 10 Km</visibility>
      <forecastDescription><es><![CDATA[Mar rizada.]]></es></forecastDescription>
    </forecast>
  </forecasts>
</day>
XML;

        $client = new EuskalmetSeaForecastClient();
        $days = $client->parseXml($xml);

        $this->assertCount(1, $days);
        $this->assertSame('2026-08-04', $days[0]->date);
        $this->assertCount(4, $days[0]->tideEvents);
        $this->assertSame('00:53', $days[0]->tideEvents[0]->hourLabel);
        $this->assertSame('baja', $days[0]->tideEvents[0]->type);
        $this->assertSame(1.22, $days[0]->tideEvents[0]->heightM);
        $this->assertSame('07:02', $days[0]->tideEvents[1]->hourLabel);
        $this->assertSame('alta', $days[0]->tideEvents[1]->type);
        $this->assertNotSame('07:00', $days[0]->tideEvents[1]->hourLabel);
        $this->assertSame(0.3, $days[0]->waveHeightM);
        $this->assertSame('Mar rizada.', $days[0]->forecastTextEs);
    }
}
