<?php

namespace App\Support;

/**
 * Enlaces públicos a redes sociales S4 (footer, SEO sameAs, etc.).
 */
final class AcademySocialLinks
{
    /**
     * @return list<array{id: string, label: string, href: string}>
     */
    public static function publicLinks(): array
    {
        $links = [];

        $instagram = self::instagramUrl();
        if ($instagram !== null) {
            $links[] = [
                'id' => 'instagram',
                'label' => 'Instagram — San Sebastián Surf School',
                'href' => $instagram,
            ];
        }

        foreach (
            [
                'youtube' => 'YouTube',
                'facebook' => 'Facebook',
                'tiktok' => 'TikTok',
            ] as $id => $name
        ) {
            $href = trim((string) config("services.academy.social.{$id}", ''));
            if ($href === '') {
                continue;
            }

            $links[] = [
                'id' => $id,
                'label' => "{$name} — San Sebastián Surf School",
                'href' => $href,
            ];
        }

        return $links;
    }

    /**
     * @return list<string>
     */
    public static function sameAsUrls(): array
    {
        return array_values(array_map(
            static fn (array $link): string => $link['href'],
            self::publicLinks(),
        ));
    }

    public static function instagramUrl(): ?string
    {
        $override = trim((string) config('services.academy.social.instagram', ''));
        if ($override !== '') {
            return $override;
        }

        $handle = trim((string) config('services.academy.instagram_handle', ''));
        if ($handle === '') {
            return null;
        }

        $user = ltrim($handle, '@');

        return $user !== '' ? 'https://www.instagram.com/'.$user.'/' : null;
    }
}
