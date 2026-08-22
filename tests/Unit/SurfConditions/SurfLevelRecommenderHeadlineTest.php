<?php

declare(strict_types=1);

namespace Tests\Unit\SurfConditions;

use App\DTOs\SurfConditions\SurfLevelStarsDto;
use App\Services\SurfConditions\SurfLevelRecommender;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SurfLevelRecommenderHeadlineTest extends TestCase
{
    #[Test]
    public function small_day_headlines_iniciacion(): void
    {
        $level = (new SurfLevelRecommender())->headlineFromStars(new SurfLevelStarsDto(4, 1, 1));
        $this->assertSame(SurfLevelRecommender::LEVEL_INICIACION, $level);
    }

    #[Test]
    public function tie_ini_int_prefers_intermedio(): void
    {
        $level = (new SurfLevelRecommender())->headlineFromStars(new SurfLevelStarsDto(5, 5, 3));
        $this->assertSame(SurfLevelRecommender::LEVEL_INTERMEDIO, $level);
    }

    #[Test]
    public function punchy_day_headlines_avanzado(): void
    {
        $level = (new SurfLevelRecommender())->headlineFromStars(new SurfLevelStarsDto(2, 4, 5));
        $this->assertSame(SurfLevelRecommender::LEVEL_AVANZADO, $level);
    }

    #[Test]
    public function all_ones_is_not_recommended(): void
    {
        $level = (new SurfLevelRecommender())->headlineFromStars(new SurfLevelStarsDto(1, 1, 1));
        $this->assertSame(SurfLevelRecommender::LEVEL_NO_RECOMENDADO, $level);
    }
}
