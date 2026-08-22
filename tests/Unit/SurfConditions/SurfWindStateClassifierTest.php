<?php

declare(strict_types=1);

namespace Tests\Unit\SurfConditions;

use App\Services\SurfConditions\SurfWindStateClassifier;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SurfWindStateClassifierTest extends TestCase
{
    #[Test]
    public function five_kmh_is_still_glassy(): void
    {
        $c = new SurfWindStateClassifier();

        $this->assertSame(SurfWindStateClassifier::GLASSY, $c->classify(5.0, 180));
        $this->assertSame(SurfWindStateClassifier::GLASSY, $c->classify(5.0, 0));
        $this->assertSame(SurfWindStateClassifier::GLASSY, $c->classify(0.0, 90));
    }

    #[Test]
    public function above_five_south_or_north_is_not_glassy(): void
    {
        $c = new SurfWindStateClassifier();

        $this->assertSame(SurfWindStateClassifier::OFFSHORE, $c->classify(5.1, 180));
        $this->assertSame(SurfWindStateClassifier::ONSHORE, $c->classify(5.1, 0));
        $this->assertNotSame(SurfWindStateClassifier::GLASSY, $c->classify(8.0, 180));
    }
}
