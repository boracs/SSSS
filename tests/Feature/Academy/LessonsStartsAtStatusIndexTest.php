<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

test('lessons tiene índice compuesto starts_at + status', function () {
    expect(Schema::hasIndex('lessons', 'lessons_starts_at_status_index'))->toBeTrue();
});
