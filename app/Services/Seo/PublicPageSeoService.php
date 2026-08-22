<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\DTOs\Seo\SeoMetaDto;
use App\Models\Article;
use App\Models\Surfboard;
use App\Services\SurfConditions\ZurriolaGeoFactsService;
use App\Support\AcademySocialLinks;
use App\Support\MoneyCents;

/**
 * SEO/GEO de páginas públicas S4. Único punto para title/description/canonical/JSON-LD
 * de marketing (home, nosotros, contacto, servicios, catálogo, taller…). Sin queries N+1 ni datos sensibles.
 */
final class PublicPageSeoService
{
    private const DEFAULT_OG_IMAGE = '/img/brand/og-share.jpg';

    private const WEBCAMS_OG_IMAGE = '/img/zurriola-surf-sunset-1280.webp';

    private const NOSOTROS_OG_IMAGE = '/img/nosotros/galeria/instalaciones-01.png';

    private const CONTACTO_OG_IMAGE = '/img/contact/equipo-s4-demo.png';

    private const SURF_CLASSES_OG_IMAGE = '/img/taller/primera-clase-surf-teoria-arena.webp';

    private const CONDITION_NEW = 'https://schema.org/NewCondition';

    private const CONDITION_USED = 'https://schema.org/UsedCondition';

    private const BUSINESS_LEASE = 'http://purl.org/goodrelations/v1#LeaseOut';

    public function __construct(
        private readonly ZurriolaGeoFactsService $zurriolaGeoFacts,
    ) {}

    public function home(): SeoMetaDto
    {
        $title = 'San Sebastian Surf School | S4 · Zurriola, Donostia';
        $description = 'Clases de surf en la playa de Zurriola (Donostia – San Sebastián). Escuela, club y material a pie de playa. Técnica, seguridad y parte del día en el Cantábrico.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/',
            ogType: 'website',
            jsonLd: [
                $this->organizationNode(),
                $this->localBusinessNode(),
                $this->webPageNode($title, $description, '/', 'WebPage'),
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
        $description = 'Conoce San Sebastian Surf School (S4): escuela de surf en Zurriola (Donostia-San Sebastián). Instalaciones a pie de playa, club, material y equipo local en el Cantábrico.';
        $path = '/nosotros';

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            jsonLd: [
                $this->organizationNode(),
                $this->localBusinessNode(),
                $this->webPageNode($title, $description, $path, 'AboutPage', self::NOSOTROS_OG_IMAGE),
                $this->breadcrumbListNode([
                    ['name' => 'Inicio', 'path' => '/'],
                    ['name' => 'Sobre nosotros', 'path' => $path],
                ]),
            ],
            ogImage: self::NOSOTROS_OG_IMAGE,
        );
    }

    public function contacto(): SeoMetaDto
    {
        $title = 'Contacto | San Sebastian Surf School · Donostia';
        $description = 'Contacta con San Sebastian Surf School (S4) en Zurriola, Donostia. Resuelve dudas sobre clases, club, material o reservas.';
        $path = '/contacto';

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            jsonLd: [
                $this->organizationNode(),
                $this->localBusinessNode(),
                $this->contactPageNode($title, $description, $path, self::CONTACTO_OG_IMAGE),
                $this->breadcrumbListNode([
                    ['name' => 'Inicio', 'path' => '/'],
                    ['name' => 'Contacto', 'path' => $path],
                ]),
            ],
            ogImage: self::CONTACTO_OG_IMAGE,
        );
    }

    public function servicios(): SeoMetaDto
    {
        $title = 'Reparación de tablas | San Sebastian Surf School · Zurriola';
        $description = 'Reparación de tablas de surf con Edy Mulder en el club de San Sebastian Surf School (Zurriola, Donostia). Marca tu taquilla, señala los toques y recoge la tabla lista.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode(
                    'Reparación de tablas de surf · San Sebastian Surf School',
                    $description,
                    '/servicios',
                ),
            ],
        );
    }

    public function serviciosSurf(): SeoMetaDto
    {
        $title = 'Clases de surf en Zurriola | San Sebastian Surf School';
        $description = 'Clases particulares y bonos de surf en la playa de Zurriola (Donostia). Academia de San Sebastian Surf School con equipo incluido y monitores locales.';
        $path = '/servicios/surf';

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            jsonLd: [
                $this->organizationNode(),
                $this->localBusinessNode(),
                $this->webPageNode($title, $description, $path, 'WebPage', self::SURF_CLASSES_OG_IMAGE),
                $this->serviceNode('Clases de surf en Zurriola', $description, $path),
                $this->courseNode('Clases y bonos de surf · San Sebastian Surf School', $description, $path),
                $this->breadcrumbListNode([
                    ['name' => 'Inicio', 'path' => '/'],
                    ['name' => 'Clases de surf', 'path' => $path],
                ]),
            ],
            ogImage: self::SURF_CLASSES_OG_IMAGE,
        );
    }

    public function serviciosSurfSkate(): SeoMetaDto
    {
        $title = 'Clases de surfskate | San Sebastian Surf School';
        $description = 'Clases de surfskate en Donostia con San Sebastian Surf School: equilibrio, fluidez y técnica en tierra. Sesiones individuales, grupales y bonos.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/surf-skate',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Clases de surfskate · San Sebastian Surf School', $description, '/servicios/surf-skate'),
                $this->courseNode('Surfskate · San Sebastian Surf School', $description, '/servicios/surf-skate'),
            ],
        );
    }

    public function serviciosSurfSkateGuia(): SeoMetaDto
    {
        $title = 'Guía para elegir tu surfskate · altura y peso | San Sebastian Surf School';
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
        $description = 'Surf trips desde Donostia hacia País Vasco, Côte Basque y Landas. Excursiones con monitor de San Sebastian Surf School y opción gastronómica al terminar.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/surf-trips',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Surf trips · San Sebastian Surf School', $description, '/servicios/surf-trips'),
            ],
        );
    }

    public function serviciosFotos(): SeoMetaDto
    {
        $title = 'Fotografía de surf en Zurriola | San Sebastian Surf School';
        $description = 'Fotografía de surf en la playa de Zurriola (Donostia). Captura tu sesión con el servicio de fotos de San Sebastian Surf School.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/fotos',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Fotografía de surf · San Sebastian Surf School', $description, '/servicios/fotos'),
            ],
        );
    }

    public function serviciosVideograbaciones(): SeoMetaDto
    {
        $title = 'Videograbaciones de surf | San Sebastian Surf School';
        $description = 'Videograbaciones de surf en Zurriola con análisis técnico. Ve tu sesión, detecta errores y mejora con San Sebastian Surf School en Donostia.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/videograbaciones',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Videograbaciones de surf · San Sebastian Surf School', $description, '/servicios/videograbaciones'),
            ],
        );
    }

    public function serviciosReparacionNeoprenos(): SeoMetaDto
    {
        $title = 'Reparación de neoprenos | San Sebastian Surf School';
        $description = 'Servicio de reparación de neoprenos del club de San Sebastian Surf School en Zurriola, Donostia. Deja tu traje en la percha y recupéralo listo para el agua.';

        return $this->make(
            title: $title,
            description: $description,
            path: '/servicios/reparacion-neoprenos',
            jsonLd: [
                $this->organizationNode(),
                $this->serviceNode('Reparación de neoprenos · San Sebastian Surf School', $description, '/servicios/reparacion-neoprenos'),
            ],
        );
    }

    public function webcams(): SeoMetaDto
    {
        $title = 'Webcam Zurriola en directo y previsión surf | San Sebastian Surf School';
        $description = 'Webcam en directo de la playa de la Zurriola (Donostia): olas, viento y previsión de surf. Parte del día y forecast de San Sebastian Surf School — escuela a unos 20 m de la playa.';
        $path = '/servicios/webcams';
        $jsonLd = [
            $this->organizationNode(),
            $this->localBusinessNode(),
            $this->webPageNode($title, $description, $path, 'WebPage', self::WEBCAMS_OG_IMAGE),
            $this->breadcrumbListNode([
                ['name' => 'Inicio', 'path' => '/'],
                ['name' => 'Servicios', 'path' => '/servicios'],
                ['name' => 'Webcam Zurriola en directo', 'path' => $path],
            ]),
            ...$this->zurriolaGeoFacts->faqJsonLdNodes($this->absoluteUrl($path)),
        ];

        return $this->make(
            title: $title,
            description: $description,
            path: $path,
            ogType: 'website',
            jsonLd: $jsonLd,
            ogImage: self::WEBCAMS_OG_IMAGE,
        );
    }

    public function tienda(): SeoMetaDto
    {
        $title = 'Tienda oficial | San Sebastian Surf School';
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
        $title = 'Blog educativo · Guías y consejos | San Sebastian Surf School';
        $description = 'Blog educativo de San Sebastian Surf School: material, lectura del mar, seguridad e iniciación. Artículos prácticos desde Zurriola (Donostia-San Sebastián).';

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
            $description = 'Artículo del blog educativo de San Sebastian Surf School: guías prácticas desde Zurriola, Donostia-San Sebastián.';
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
        $description = 'Catálogo de tablas de surf de segunda mano en San Sebastian Surf School (Zurriola, Donostia). Precios públicos, sin compromiso; consulta disponibilidad en el club.';

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

        $title = $name.' | Segunda mano · San Sebastian Surf School';
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
            Surfboard::CATEGORY_SOFT => 'softboards',
            Surfboard::CATEGORY_HARD_BASIC => 'duras básicas',
            Surfboard::CATEGORY_HARD_PRO => 'duras pro',
            default => null,
        };

        $title = $label !== null
            ? 'Alquiler de tablas '.$label.' | San Sebastian Surf School'
            : 'Alquiler de tablas de surf | San Sebastian Surf School';
        $description = $label !== null
            ? 'Alquila tablas '.$label.' en San Sebastian Surf School (Zurriola, Donostia). Consulta disponibilidad y reserva online.'
            : 'Alquila tablas de surf (softboards, duras básicas y duras pro) en San Sebastian Surf School, a pie de Zurriola en Donostia.';

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
     * Ficha pública de alquiler. Precio de referencia = pack de 1 día (si hay schema).
     *
     * @param  array{
     *     id: int|string,
     *     name: string,
     *     description?: string|null,
     *     category?: string|null,
     *     image_url?: string|null,
     *     price_day_eur?: float|string|null,
     *     is_active?: bool|null
     * }  $board
     */
    public function rentalsShow(array $board): SeoMetaDto
    {
        $id = (int) $board['id'];
        $name = (string) $board['name'];
        $path = '/tablas-alquiler/tabla/'.$id;
        $category = (string) ($board['category'] ?? '');
        $categoryLabel = Surfboard::categoryLabel($category);
        $descBody = trim((string) ($board['description'] ?? ''));
        $imageUrl = (string) ($board['image_url'] ?? '');
        $priceDay = $board['price_day_eur'] ?? null;
        $inStock = (bool) ($board['is_active'] ?? true);

        $title = $name.' · Alquiler | San Sebastian Surf School';
        $description = 'Alquila '.$name.' ('.$categoryLabel.') en San Sebastian Surf School, Zurriola (Donostia).'
            .($descBody !== '' ? ' '.mb_substr($descBody, 0, 120) : '');

        $jsonLd = [$this->organizationNode()];
        if ($priceDay !== null && $priceDay !== '' && (float) $priceDay > 0) {
            $jsonLd[] = $this->productNode(
                name: $name,
                path: $path,
                priceEur: number_format((float) $priceDay, 2, '.', ''),
                inStock: $inStock,
                imageUrl: $imageUrl,
                brandName: 'San Sebastian Surf School',
                category: $categoryLabel,
                sku: 'rent-'.$id,
                itemCondition: self::CONDITION_USED,
                businessFunction: self::BUSINESS_LEASE,
                offerName: 'Alquiler 1 día',
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
        string $description = '',
    ): SeoMetaDto {
        $path = '/producto-ver/'.$id;
        $title = $name.' | Tienda San Sebastian Surf School';
        $trimmed = trim($description);
        $metaDescription = $trimmed !== ''
            ? mb_substr($trimmed, 0, 160)
            : $name.' en la tienda oficial de San Sebastian Surf School (S4). Material y accesorios para socios con taquilla en Zurriola, Donostia.';
        $category = implode(', ', array_values(array_filter($categoryLabels)));

        return $this->make(
            title: $title,
            description: $metaDescription,
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
                    description: $metaDescription,
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
            'sameAs' => AcademySocialLinks::sameAsUrls(),
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
        ?string $imagePath = null,
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

        if ($imagePath !== null && $imagePath !== '') {
            $node['primaryImageOfPage'] = [
                '@type' => 'ImageObject',
                'url' => $this->absoluteUrl($imagePath),
            ];
        }

        return $node;
    }

    /** @return array<string, mixed> */
    private function contactPageNode(
        string $name,
        string $description,
        string $path,
        ?string $imagePath = null,
    ): array {
        $node = $this->webPageNode($name, $description, $path, 'ContactPage', $imagePath);
        $node['mainEntity'] = [
            '@type' => 'Organization',
            'name' => 'San Sebastian Surf School',
            'url' => $this->absoluteUrl('/'),
            'contactPoint' => $this->contactPointNode(),
        ];

        return $node;
    }

    /** @return array<string, mixed> */
    private function contactPointNode(): array
    {
        return [
            '@type' => 'ContactPoint',
            'contactType' => 'customer service',
            'email' => (string) config('services.academy.contact_email', 'info@sansebastiansurfschool.com'),
            'availableLanguage' => ['es', 'en'],
            'areaServed' => 'ES',
        ];
    }

    /**
     * @param  list<array{name: string, path: string}>  $items
     * @return array<string, mixed>
     */
    private function breadcrumbListNode(array $items): array
    {
        $listItems = [];

        foreach ($items as $position => $item) {
            $listItems[] = [
                '@type' => 'ListItem',
                'position' => $position + 1,
                'name' => $item['name'],
                'item' => $this->absoluteUrl($item['path']),
            ];
        }

        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => $listItems,
        ];
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
        ?string $description = null,
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
        if ($description !== null && trim($description) !== '') {
            $node['description'] = trim($description);
        }
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
}
