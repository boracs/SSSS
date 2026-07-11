<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Article;
use Illuminate\Database\Seeder;

class ArticleSeeder extends Seeder
{
    public function run(): void
    {
        /** @var list<array{title: string, slug: string, excerpt: string, content: string, meta_title: string, meta_description: string, meta_keywords: string}> $articles */
        $articles = require database_path('seeders/data/taller_articles.php');

        foreach ($articles as $article) {
            Article::query()->updateOrCreate(
                ['slug' => $article['slug']],
                $article,
            );
        }
    }
}
