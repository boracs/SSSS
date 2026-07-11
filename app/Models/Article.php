<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'meta_title',
        'meta_description',
        'meta_keywords',
    ];

    protected $appends = [
        'seo_title',
        'seo_description',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return Attribute<string, never> */
    protected function seoTitle(): Attribute
    {
        return Attribute::get(
            fn (): string => $this->meta_title ?? $this->title,
        );
    }

    /** @return Attribute<string, never> */
    protected function seoDescription(): Attribute
    {
        return Attribute::get(
            fn (): string => $this->meta_description ?? $this->excerpt,
        );
    }
}
