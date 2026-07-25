<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\DTOs\Seo\SeoMetaDto;
use App\Models\Article;
use App\Services\SurfConditions\ZurriolaGeoFactsService;
use App\Support\MoneyCents;

/**
 * SEO/GEO de páginas públicas S4. Único punto para title/description/canonical/JSON-LD
 * de marketing (home, nosotros, contacto, servicios, catálogo, taller…). Sin queries N+1 ni datos sensibles.
 */
final class PublicPageSeoService
{
    private const DEFAULT_OG_IMAGE = '/img/brand/og-share.jpg';

    private const CONDITION_NEW = 'https://schema.org/NewCondition';

    private const CONDITION_USED = 'https://schema.org/UsedCondition';

    private const BUSINESS_LEASE = 'http://purl.org/goodrelations/v1#LeaseOut';

    public function __construct(
        private readonly ZurriolaGeoFactsService $zurriolaGeoFacts,
    ) {}

    public function home(): SeoMetaDto
    {
        $title = 'San Sebastian Surf School | S4 · Zurriola, Donostia';
        $description = 'Escuela de surf en la playa de Zurriola (Donostia / San Sebastián). Clases, club, material y parte del día. Seguridad y técnica en el Cantábrico.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/',
            ogType: 'website',
            jsonLd: [
                $this->organizationNode(),
                $this->localBusinessNode(),
            ],
            preloadImages: [
                [
                    'href' => '/img/zurriola-surf-sunset-1280.webp',
                    'as' => 'image',
                    'type' => 'image/webp',
                    'imagesrcset' => '/img/zurriola-surf-sunset-960.webp 960w, /img/zurriola-surf-sunset-1280.webp 1280w, /img/zurriola-surf-sunset-1920.webp 1920w',
                    'imagesizes' => '100vw',
                    'fetchpriority' => 'high',
                ],
            ],
        );
    }

    public function nosotros(): SeoMetaDto
    {
        $title = 'Sobre nosotros | San Sebastian Surf School · Zurriola';
        $description = 'Conoce S4: escuela de surf en Zurriola (Donostia-San Sebastián). Instalaciones a pie de playa, club, material y equipo local en el Cantábrico.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/nosotros',
            jsonLd: [
                $this->organizationNode(),
                $this->localBusinessNode(),
                $this->webPageNode($title, $description, '/nosotros', 'AboutPage'),
            ],
        );
    }

    public function contacto(): SeoMetaDto
    {
        $title = 'Contacto | San Sebastian Surf School · Donostia';
        $description = 'Contacta con San Sebastian Surf School (S4) en Zurriola, Donostia. Resuelve dudas sobre clases, club, material o reservas.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/contacto',
            jsonLd: [
                $this->organizationNode(),
                $this->localBusinessNode(),
                $this->webPageNode($title, $description, '/contacto', 'ContactPage'),
            ],
        );
    }

    public function servicios(): SeoMetaDto
    {
        $title = 'Reparación de tablas | San Sebastian Surf School · Zurriola';
        $description = 'Reparación de tablas de surf con Edy Mulder en el club S4 (Zurriola, Donostia). Marca tu taquilla, señala los toques y recoge la tabla lista.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode(
                    'Reparación de tablas de surf S4',
                    $description,
                    '/servicios',
                ),
            ],
        );
    }

    public function serviciosSurf(): SeoMetaDto
    {
        $title = 'Clases de surf en Zurriola | San Sebastian Surf School';
        $description = 'Clases particulares y bonos de surf en la playa de Zurriola (Donostia). Academia S4 con equipo incluido y monitores locales.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/surf',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Clases de surf en Zurriola', $description, '/servicios/surf'),
                $this->courseNode('Clases y bonos de surf S4', $description, '/servicios/surf'),
            ],
        );
    }

    public function serviciosSurfSkate(): SeoMetaDto
    {
        $title = 'Clases de surfskate | San Sebastian Surf School';
        $description = 'Clases de surfskate en Donostia con S4: equilibrio, fluidez y técnica en tierra. Sesiones individuales, grupales y bonos.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/surf-skate',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Clases de surfskate S4', $description, '/servicios/surf-skate'),
                $this->courseNode('Surfskate S4', $description, '/servicios/surf-skate'),
            ],
        );
    }

    public function serviciosSurfSkateGuia(): SeoMetaDto
    {
        $title = 'Guía para elegir tu surfskate · altura y peso | S4';
        $description = 'Guía práctica de San Sebastian Surf School para elegir surfskate YOW según tu altura, peso y estilo. Tabla de medidas y consejos sin tecnicismos.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/surf-skate/guia-equipamiento',
            jsonLd: [
                $this->organizationNode(),
                $this->webPageNode($title, $description, '/servicios/surf-skate/guia-equipamiento'),
            ],
        );
    }

    public function serviciosSurfTrips(): SeoMetaDto
    {
        $title = 'Surf trips desde Guipúzcoa | San Sebastian Surf School';
        $description = 'Surf trips desde Donostia hacia País Vasco, Côte Basque y Landas. Excursiones con monitor S4 y opción gastronómica al terminar.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/surf-trips',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Surf trips S4', $description, '/servicios/surf-trips'),
            ],
        );
    }

    public function serviciosFotos(): SeoMetaDto
    {
        $title = 'Fotografía de surf en Zurriola | San Sebastian Surf School';
        $description = 'Fotografía de surf en la playa de Zurriola (Donostia). Captura tu sesión con el servicio de fotos S4.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/fotos',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Fotografía de surf S4', $description, '/servicios/fotos'),
            ],
        );
    }

    public function serviciosVideograbaciones(): SeoMetaDto
    {
        $title = 'Videograbaciones de surf | San Sebastian Surf School';
        $description = 'Videograbaciones de surf en Zurriola con análisis técnico. Ve tu sesión, detecta errores y mejora con S4 en Donostia.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/videograbaciones',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Videograbaciones de surf S4', $description, '/servicios/videograbaciones'),
            ],
        );
    }

    public function serviciosReparacionNeoprenos(): SeoMetaDto
    {
        $title = 'Reparación de neoprenos | San Sebastian Surf School';
        $description = 'Servicio de reparación de neoprenos del club S4 en Zurriola, Donostia. Deja tu traje en la percha y recupéralo listo para el agua.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/reparacion-neoprenos',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Reparación de neoprenos S4', $description, '/servicios/reparacion-neoprenos'),
            ],
        );
    }

    public function webcams(): SeoMetaDto
    {
        $title = 'Webcam Zurriola en directo | San Sebastian Surf School';
        $description = 'Webcam en directo de la playa de Zurriola (Donostia), previsión y parte S4 del día. Escuela a unos 20 metros de la playa; comprueba olas y viento antes de surfear.';
        $path = '/servicios/webcams';
        $jsonLd = [
            $this->organizationNode(),
            $this->localBusinessNode(),
            $this->webPageNode($title, $description, $path),
            ...$this->zurriolaGeoFacts->faqJsonLdNodes($this->absoluteUrl($path)),
        ];

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            ogType: 'website',
            jsonLd: $jsonLd,
        );
    }

    public function tienda(): SeoMetaDto
    {
        $title = 'Tienda oficial S4 | San Sebastian Surf School';
        $description = 'Tienda de material y accesorios de San Sebastian Surf School (S4) en Zurriola, Donostia. Productos para socios del club.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/tienda',
            jsonLd: [
                $this->organizationNode(),
                $this->webPageNode($title, $description, '/tienda', 'CollectionPage'),
            ],
        );
    }

    public function tallerIndex(): SeoMetaDto
    {
        $path = '/taller';
        $title = 'Taller de Surf · Guías y consejos | S4';
        $description = 'Guías del Taller S4: material, lectura del mar, seguridad e iniciación. Artículos prácticos desde Zurriola (Donostia-San Sebastián).';

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            jsonLd: [
                $this->organizationNode(),
                $this->webPageNode($title, $description, $path, 'CollectionPage'),
            ],
        );
    }

    public function tallerArticle(Article $article): SeoMetaDto
    {
        $slug = trim((string) $article->slug);
        $path = '/taller/'.$slug;
        $title = trim((string) ($article->seo_title ?: $article->title));
        $description = trim((string) ($article->seo_description ?: $article->excerpt ?: ''));
        if ($description === '') {
            $description = 'Artículo del Taller de Surf S4: guías prácticas desde Zurriola, Donostia-San Sebastián.';
        }

        $imagePath = $this->firstImageSrcFromHtml((string) $article->content);
        $canonical = $this->absoluteUrl($path);
        $imageAbsolute = $this->absoluteUrl($imagePath ?? self::DEFAULT_OG_IMAGE);

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            ogType: 'article',
            jsonLd: [
                $this->organizationNode(),
                $this->webPageNode($title, $description, $path),
                $this->articleNode(
                    headline: $title,
                    description: $description,
                    path: $path,
                    canonical: $canonical,
                    imageUrl: $imageAbsolute,
                    datePublished: $article->created_at?->toAtomString(),
                    dateModified: $article->updated_at?->toAtomString(),
                ),
            ],
            ogImage: $imagePath,
        );
    }

    public function segundaManoIndex(): SeoMetaDto
    {
        $title = 'Tablas de segunda mano | San Sebastian Surf School';
        $description = 'Catálogo de tablas de surf de segunda mano en S4 (Zurriola, Donostia). Precios públicos, sin compromiso; consulta disponibilidad en el club.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/segunda-mano',
            jsonLd: [
                $this->organizationNode(),
                $this->webPageNode($title, $description, '/segunda-mano', 'CollectionPage'),
            ],
        );
    }

    /**
     * Ficha pública 2ª mano. Solo datos de toPublicArray() (nunca purchase_price).
     *
     * @param  array{
     *     id: int|string,
     *     name: string,
     *     brand?: string|null,
     *     model?: string|null,
     *     description?: string|null,
     *     board_type_label?: string|null,
     *     effective_price: int,
     *     first_image?: string|null,
     *     status?: string|null
     * }  $board
     */
    public function segundaManoShow(array $board): SeoMetaDto
    {
        $id = (int) $board['id'];
        $name = (string) $board['name'];
        $path = '/segunda-mano/'.$id;
        $brand = trim((string) ($board['brand'] ?? ''));
        $model = trim((string) ($board['model'] ?? ''));
        $typeLabel = trim((string) ($board['board_type_label'] ?? ''));
        $descBody = trim((string) ($board['description'] ?? ''));
        $priceCents = (int) ($board['effective_price'] ?? 0);
        $imageUrl = (string) ($board['first_image'] ?? '');
        $inStock = ($board['status'] ?? 'available') === 'available';

        $title = $name.' | Segunda mano S4';
        $bits = array_values(array_filter([$brand, $model, $typeLabel !== '' ? $typeLabel : null]));
        $description = $name.' de segunda mano en San Sebastian Surf School (Zurriola, Donostia).'
            .($bits !== [] ? ' '.implode(' · ', $bits).'.' : '')
            .($descBody !== '' ? ' '.mb_substr($descBody, 0, 120) : '');

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            ogType: 'product',
            jsonLd: [
                $this->organizationNode(),
                $this->productNode(
                    name: $name,
                    path: $path,
                    priceEur: $this->formatEurFromCents($priceCents),
                    inStock: $inStock,
                    imageUrl: $imageUrl,
                    brandName: $brand !== '' ? $brand : 'San Sebastian Surf School',
                    category: $typeLabel !== '' ? $typeLabel : 'Tabla de surf segunda mano',
                    sku: 'sh-'.$id,
                    itemCondition: self::CONDITION_USED,
                ),
            ],
            ogImage: $imageUrl !== '' ? $imageUrl : null,
        );
    }

    public function rentalsIndex(?string $category = null): SeoMetaDto
    {
        $category = $category !== null && $category !== '' ? $category : null;
        $path = $category !== null
            ? '/tablas-alquiler/'.$category
            : '/tablas-alquiler';

        $label = match ($category) {
            'soft' => 'softboards',
            'hard' => 'hardboards',
            default => null,
        };

        $title = $label !== null
            ? 'Alquiler de tablas '.$label.' | San Sebastian Surf School'
            : 'Alquiler de tablas de surf | San Sebastian Surf School';
        $description = $label !== null
            ? 'Alquila tablas '.$label.' en S4 (Zurriola, Donostia). Consulta disponibilidad y reserva online.'
            : 'Alquila tablas de surf (soft y hard) en San Sebastian Surf School, a pie de Zurriola en Donostia.';

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            jsonLd: [
                $this->organizationNode(),
                $this->webPageNode($title, $description, $path, 'CollectionPage'),
            ],
        );
    }

    /**
     * Ficha pública de alquiler. Precio de referencia = tarifa 24 h (si hay schema).
     *
     * @param  array{
     *     id: int|string,
     *     name: string,
     *     description?: string|null,
     *     category?: string|null,
     *     image_url?: string|null,
     *     price_24h_eur?: float|string|null,
     *     is_active?: bool|null
     * }  $board
     */
    public function rentalsShow(array $board): SeoMetaDto
    {
        $id = (int) $board['id'];
        $name = (string) $board['name'];
        $path = '/tablas-alquiler/tabla/'.$id;
        $category = (string) ($board['category'] ?? '');
        $categoryLabel = match ($category) {
            'soft' => 'Softboard',
            'hard' => 'Hardboard',
            default => 'Tabla de alquiler',
        };
        $descBody = trim((string) ($board['description'] ?? ''));
        $imageUrl = (string) ($board['image_url'] ?? '');
        $price24 = $board['price_24h_eur'] ?? null;
        $inStock = (bool) ($board['is_active'] ?? true);

        $title = $name.' · Alquiler | San Sebastian Surf School';
        $description = 'Alquila '.$name.' ('.$categoryLabel.') en San Sebastian Surf School, Zurriola (Donostia).'
            .($descBody !== '' ? ' '.mb_substr($descBody, 0, 120) : '');

        $jsonLd = [$this->organizationNode()];
        if ($price24 !== null && $price24 !== '' && (float) $price24 > 0) {
            $jsonLd[] = $this->productNode(
                name: $name,
                path: $path,
                priceEur: number_format((float) $price24, 2, '.', ''),
                inStock: $inStock,
                imageUrl: $imageUrl,
                brandName: 'San Sebastian Surf School',
                category: $categoryLabel,
                sku: 'rent-'.$id,
                itemCondition: self::CONDITION_USED,
                businessFunction: self::BUSINESS_LEASE,
                offerName: 'Alquiler 24 h',
            );
        } else {
            $jsonLd[] = $this->webPageNode($title, $description, $path);
        }

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            ogType: 'product',
            jsonLd: $jsonLd,
            ogImage: $imageUrl !== '' ? $imageUrl : null,
        );
    }

    /**
     * Ficha de producto de la tienda socios (indexable).
     *
     * @param  list<string>  $categoryLabels
     */
    public function producto(
        int $id,
        string $name,
        float $priceEur,
        bool $inStock,
        string $imageUrl = '',
        array $categoryLabels = [],
    ): SeoMetaDto {
        $path = '/producto-ver/'.$id;
        $title = $name.' | Tienda San Sebastian Surf School';
        $description = $name.' en la tienda oficial de San Sebastian Surf School (S4). Material y accesorios para socios con taquilla en Zurriola, Donostia.';
        $category = implode(', ', array_values(array_filter($categoryLabels)));

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            ogType: 'product',
            jsonLd: [
                $this->organizationNode(),
                $this->productNode(
                    name: $name,
                    path: $path,
                    priceEur: number_format($priceEur, 2, '.', ''),
                    inStock: $inStock,
                    imageUrl: $imageUrl,
                    brandName: 'San Sebastian Surf School',
                    category: $category !== '' ? $category : null,
                    sku: (string) $id,
                    itemCondition: self::CONDITION_NEW,
                ),
            ],
            ogImage: $imageUrl !== '' ? $imageUrl : null,
        );
    }

    /**
     * @param  list<array<string, mixed>>  $jsonLd
     * @param  list<array<string, string>>  $preloadImages
     */
    private function make(
        string $title,
        string $description,
        string $path,
        string $ogType = 'website',
        string $robots = 'index, follow',
        array $jsonLd = [],
        ?string $ogImage = null,
        array $preloadImages = [],
    ): SeoMetaDto {
        $canonical = $this->absoluteUrl($path);
        $image = $this->absoluteUrl($ogImage ?? self::DEFAULT_OG_IMAGE);

        return new SeoMetaDto(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogTitle: $title,
            ogDescription: $description,
            ogImage: $image,
            ogType: $ogType,
            ogLocale: 'es_ES',
            robots: $robots,
            jsonLd: $jsonLd,
            preloadImages: $preloadImages,
        );
    }

    /** @return array<string, mixed> */
    private function organizationNode(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => 'San Sebastian Surf School',
            'alternateName' => 'S4',
            'url' => $this->absoluteUrl('/'),
            'logo' => $this->absoluteUrl('/img/brand/logo-navy-mark.png'),
            'email' => (string) config('services.academy.contact_email', 'info@sansebastiansurfschool.com'),
            'sameAs' => array_values(array_filter([
                $this->instagramUrl(),
            ])),
        ];
    }

    /** @return array<string, mixed> */
    private function localBusinessNode(): array
    {
        $lat = (float) config('services.zurriola_surf.latitude', 43.325);
        $lon = (float) config('services.zurriola_surf.longitude', -1.975);

        return [
            '@context' => 'https://schema.org',
            '@type' => 'SportsActivityLocation',
            'name' => 'San Sebastian Surf School',
            'alternateName' => 'S4 Surf School',
            'description' => 'Escuela de surf en Zurriola, Donostia-San Sebastián. Clases, club e instalaciones a pie de playa.',
            'url' => $this->absoluteUrl('/'),
            'image' => $this->absoluteUrl(self::DEFAULT_OG_IMAGE),
            'email' => (string) config('services.academy.contact_email', 'info@sansebastiansurfschool.com'),
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => 'Playa de Zurriola',
                'addressLocality' => 'Donostia-San Sebastián',
                'addressRegion' => 'Gipuzkoa',
                'postalCode' => '20001',
                'addressCountry' => 'ES',
            ],
            'geo' => [
                '@type' => 'GeoCoordinates',
                'latitude' => $lat,
                'longitude' => $lon,
            ],
            'areaServed' => [
                '@type' => 'Place',
                'name' => 'Zurriola, Donostia-San Sebastián',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function webPageNode(
        string $name,
        string $description,
        string $path,
        string $type = 'WebPage',
    ): array {
        $node = [
            '@context' => 'https://schema.org',
            '@type' => $type,
            'name' => $name,
            'description' => $description,
            'url' => $this->absoluteUrl($path),
            'isPartOf' => [
                '@type' => 'WebSite',
                'name' => 'San Sebastian Surf School',
                'url' => $this->absoluteUrl('/'),
            ],
            'about' => [
                '@type' => 'Place',
                'name' => 'Playa de Zurriola',
                'address' => [
                    '@type' => 'PostalAddress',
                    'addressLocality' => 'Donostia-San Sebastián',
                    'addressRegion' => 'Gipuzkoa',
                    'addressCountry' => 'ES',
                ],
            ],
        ];

        return $node;
    }

    /** @return array<string, mixed> */
    private function serviceNode(
        string $name,
        string $description,
        string $path,
    ): array {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'Service',
            'name' => $name,
            'description' => $description,
            'url' => $this->absoluteUrl($path),
            'provider' => [
                '@type' => 'Organization',
                'name' => 'San Sebastian Surf School',
                'url' => $this->absoluteUrl('/'),
            ],
            'areaServed' => [
                '@type' => 'Place',
                'name' => 'Zurriola, Donostia-San Sebastián',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function courseNode(string $name, string $description, string $path): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'Course',
            'name' => $name,
            'description' => $description,
            'url' => $this->absoluteUrl($path),
            'provider' => [
                '@type' => 'Organization',
                'name' => 'San Sebastian Surf School',
                'url' => $this->absoluteUrl('/'),
            ],
        ];
    }

    /**
     * Product + Offer. Precio siempre string decimal EUR (nunca float crudo ni céntimos en JSON-LD).
     *
     * @return array<string, mixed>
     */
    private function productNode(
        string $name,
        string $path,
        string $priceEur,
        bool $inStock,
        string $imageUrl = '',
        string $brandName = 'San Sebastian Surf School',
        ?string $category = null,
        ?string $sku = null,
        string $itemCondition = self::CONDITION_NEW,
        ?string $businessFunction = null,
        ?string $offerName = null,
    ): array {
        $ogImage = $imageUrl !== '' ? $imageUrl : self::DEFAULT_OG_IMAGE;

        $offer = [
            '@type' => 'Offer',
            'url' => $this->absoluteUrl($path),
            'priceCurrency' => 'EUR',
            'price' => $priceEur,
            'availability' => $inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            'itemCondition' => $itemCondition,
            'seller' => [
                '@type' => 'Organization',
                'name' => 'San Sebastian Surf School',
            ],
        ];
        if ($businessFunction !== null) {
            $offer['businessFunction'] = $businessFunction;
        }
        if ($offerName !== null && $offerName !== '') {
            $offer['name'] = $offerName;
        }

        $node = [
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $name,
            'url' => $this->absoluteUrl($path),
            'image' => [$this->absoluteUrl($ogImage)],
            'brand' => [
                '@type' => 'Brand',
                'name' => $brandName,
            ],
            'offers' => $offer,
        ];
        if ($sku !== null && $sku !== '') {
            $node['sku'] = $sku;
        }
        if ($category !== null && $category !== '') {
            $node['category'] = $category;
        }

        return $node;
    }

    /** @return array<string, mixed> */
    private function articleNode(
        string $headline,
        string $description,
        string $path,
        string $canonical,
        string $imageUrl,
        ?string $datePublished,
        ?string $dateModified,
    ): array {
        $node = [
            '@context' => 'https://schema.org',
            '@type' => 'Article',
            'headline' => $headline,
            'description' => $description,
            'url' => $this->absoluteUrl($path),
            'mainEntityOfPage' => [
                '@type' => 'WebPage',
                '@id' => $canonical,
            ],
            'author' => [
                '@type' => 'Organization',
                'name' => 'San Sebastian Surf School',
                'url' => $this->absoluteUrl('/'),
            ],
            'publisher' => [
                '@type' => 'Organization',
                'name' => 'San Sebastian Surf School',
                'url' => $this->absoluteUrl('/'),
                'logo' => [
                    '@type' => 'ImageObject',
                    'url' => $this->absoluteUrl('/img/brand/logo-navy-mark.png'),
                ],
            ],
            'image' => [$imageUrl],
        ];

        if ($datePublished !== null && $datePublished !== '') {
            $node['datePublished'] = $datePublished;
        }
        if ($dateModified !== null && $dateModified !== '') {
            $node['dateModified'] = $dateModified;
        }

        return $node;
    }

    private function firstImageSrcFromHtml(string $html): ?string
    {
        if ($html === '') {
            return null;
        }
        if (! preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $matches)) {
            return null;
        }
        $src = trim((string) ($matches[1] ?? ''));

        return $src !== '' ? $src : null;
    }

    private function formatEurFromCents(int $cents): string
    {
        return number_format(MoneyCents::centsToEuros($cents), 2, '.', '');
    }

    private function absoluteUrl(string $path): string
    {
        $base = rtrim((string) config('app.url'), '/');
        if ($path === '' || $path === '/') {
            return $base.'/';
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return $base.'/'.ltrim($path, '/');
    }

    private function instagramUrl(): ?string
    {
        $handle = trim((string) config('services.academy.instagram_handle', ''));
        if ($handle === '') {
            return null;
        }
        $user = ltrim($handle, '@');

        return $user !== '' ? 'https://www.instagram.com/'.$user.'/' : null;
    }
}
