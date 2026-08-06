<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AuctionBidStatus;
use App\Enums\AuctionCategory;
use App\Enums\AuctionStatus;
use App\Enums\PaymentStatus;
use App\Models\Auction;
use App\Models\AuctionBid;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Demo local: 15 subastas (4 live, 6 settled, 5 draft próximas).
 * Idempotente: borra lotes con slug demo-subasta-* antes de recrear.
 */
class AuctionDemoSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::query()->where('role', 'admin')->value('id');
        $bidders = User::query()
            ->where('role', '!=', 'admin')
            ->get()
            ->filter(fn (User $u) => $u->canAccessAuctions())
            ->values();

        if ($bidders->isEmpty()) {
            $this->command?->warn('AuctionDemoSeeder: no hay usuarios con acceso a subastas; se crean lotes sin pujas.');
        }

        DB::transaction(function () use ($adminId, $bidders): void {
            $existing = Auction::query()->where('slug', 'like', 'demo-subasta-%')->get();
            foreach ($existing as $auction) {
                $auction->bids()->delete();
                $auction->delete();
            }

            foreach ($this->lots() as $index => $lot) {
                $slug = 'demo-subasta-'.Str::padLeft((string) ($index + 1), 2, '0').'-'.$lot['slug_suffix'];
                $auction = Auction::query()->create([
                    'title'                => $lot['title'],
                    'slug'                 => $slug,
                    'description'          => $lot['description'],
                    'category'             => $lot['category']->value,
                    'images'               => [$lot['image']],
                    'starting_price_cents' => $lot['starting_cents'],
                    'current_price_cents'  => $lot['starting_cents'],
                    'min_increment_cents'  => $lot['increment_cents'],
                    'reserve_price_cents'  => $lot['reserve_cents'],
                    'bid_count'            => 0,
                    'status'               => $lot['status']->value,
                    'payment_status'       => $lot['payment_status']?->value,
                    'winner_user_id'       => null,
                    'created_by'           => $adminId,
                    'starts_at'            => $lot['starts_at'],
                    'ends_at'              => $lot['ends_at'],
                    'settled_at'           => $lot['settled_at'],
                ]);

                $this->seedBids($auction, $lot, $bidders);
            }
        });

        $this->command?->info('AuctionDemoSeeder: 15 lotes demo listos (4 live · 6 settled · 5 draft).');
    }

    /**
     * @param  \Illuminate\Support\Collection<int, User>  $bidders
     * @param  array<string, mixed>  $lot
     */
    private function seedBids(Auction $auction, array $lot, $bidders): void
    {
        $bidCount = (int) ($lot['bids'] ?? 0);
        if ($bidCount <= 0 || $bidders->isEmpty()) {
            return;
        }

        $amount = $auction->starting_price_cents;
        $winner = null;

        for ($i = 0; $i < $bidCount; $i++) {
            $bidder = $bidders[$i % $bidders->count()];
            if ($i > 0) {
                $amount += $auction->min_increment_cents;
            }

            AuctionBid::query()->create([
                'auction_id'   => $auction->id,
                'user_id'      => $bidder->id,
                'amount_cents' => $amount,
                'status'       => AuctionBidStatus::Outbid->value,
                'created_at'   => now()->subHours(($bidCount - $i) * 3),
                'updated_at'   => now()->subHours(($bidCount - $i) * 3),
            ]);

            $winner = $bidder;
        }

        AuctionBid::query()
            ->where('auction_id', $auction->id)
            ->orderByDesc('amount_cents')
            ->limit(1)
            ->update(['status' => AuctionBidStatus::Winning->value]);

        $auction->forceFill([
            'current_price_cents' => $amount,
            'bid_count'           => $bidCount,
            'winner_user_id'      => in_array($auction->status, [AuctionStatus::Settled, AuctionStatus::Ended], true)
                ? $winner?->id
                : null,
        ])->save();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function lots(): array
    {
        $now = now();

        return [
            // ── 4 en curso ──────────────────────────────────────────
            [
                'title'           => 'Lost Driver 6\'0" — carbon fiber',
                'slug_suffix'     => 'lost-driver',
                'description'     => 'Tabla performance en muy buen estado. Ideal para olas de hombro a cabeza en Zurriola. Quillas FCS II incluidas.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-lost-blanca.webp',
                'starting_cents'  => 32000,
                'increment_cents' => 1000,
                'reserve_cents'   => 38000,
                'status'          => AuctionStatus::Live,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->subDays(2),
                'ends_at'         => $now->copy()->addDays(2)->addHours(6),
                'settled_at'      => null,
                'bids'            => 7,
            ],
            [
                'title'           => 'Neopreno Quiksilver 4/3 — talla M',
                'slug_suffix'     => 'neo-quiksilver',
                'description'     => 'Neopreno de temporada pasada, apenas usado. Cremallera pecho, forro térmico. Perfecto para primavera/otoño en el Cantábrico.',
                'category'        => AuctionCategory::Wetsuit,
                'image'           => 'img/tienda/demo/producto-neopreno.webp',
                'starting_cents'  => 8500,
                'increment_cents' => 500,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Live,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->subDay(),
                'ends_at'         => $now->copy()->addHours(18),
                'settled_at'      => null,
                'bids'            => 4,
            ],
            [
                'title'           => 'Set quillas FCS II Performer M',
                'slug_suffix'     => 'quillas-fcs',
                'description'     => 'Set thruster FCS II Performer medium. Uso suave, sin mellas. Incluye bolsa original.',
                'category'        => AuctionCategory::Accessory,
                'image'           => 'img/tienda/demo/producto-quillas-set.webp',
                'starting_cents'  => 4500,
                'increment_cents' => 250,
                'reserve_cents'   => 5500,
                'status'          => AuctionStatus::Live,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->subHours(12),
                'ends_at'         => $now->copy()->addDays(4),
                'settled_at'      => null,
                'bids'            => 3,
            ],
            [
                'title'           => 'Gong Softboard 7\'2" — escuela',
                'slug_suffix'     => 'gong-soft',
                'description'     => 'Softboard estable, ideal iniciación o longboard small waves. Espuma en buen estado, leash incluido.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-gong-negra.webp',
                'starting_cents'  => 18000,
                'increment_cents' => 500,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Live,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->subHours(6),
                'ends_at'         => $now->copy()->addDays(1)->addHours(8),
                'settled_at'      => null,
                'bids'            => 5,
            ],

            // ── 6 adjudicadas ───────────────────────────────────────
            [
                'title'           => 'Bullrun Fish 5\'10" — epoxy',
                'slug_suffix'     => 'bullrun-fish',
                'description'     => 'Fish ágil para días de menos energía. Adjudicada a socio VIP. Material premium S4.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-bullrun.webp',
                'starting_cents'  => 25000,
                'increment_cents' => 1000,
                'reserve_cents'   => 28000,
                'status'          => AuctionStatus::Settled,
                'payment_status'  => PaymentStatus::Confirmed,
                'starts_at'       => $now->copy()->subDays(20),
                'ends_at'         => $now->copy()->subDays(12),
                'settled_at'      => $now->copy()->subDays(10),
                'bids'            => 9,
            ],
            [
                'title'           => 'Occy shortboard 6\'2" — PU',
                'slug_suffix'     => 'occy-short',
                'description'     => 'Shortboard clásico, ding reparado en cola. Lista para sessiones en Zurriola.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-occy-trio.webp',
                'starting_cents'  => 20000,
                'increment_cents' => 750,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Settled,
                'payment_status'  => PaymentStatus::Confirmed,
                'starts_at'       => $now->copy()->subDays(25),
                'ends_at'         => $now->copy()->subDays(18),
                'settled_at'      => $now->copy()->subDays(16),
                'bids'            => 6,
            ],
            [
                'title'           => 'Invento deck pad Traction Pro',
                'slug_suffix'     => 'invento-pad',
                'description'     => 'Pad completo 3 piezas, sin usar. Adhesivo intacto.',
                'category'        => AuctionCategory::Accessory,
                'image'           => 'img/tienda/demo/producto-invento.webp',
                'starting_cents'  => 2500,
                'increment_cents' => 100,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Settled,
                'payment_status'  => PaymentStatus::Confirmed,
                'starts_at'       => $now->copy()->subDays(15),
                'ends_at'         => $now->copy()->subDays(9),
                'settled_at'      => $now->copy()->subDays(8),
                'bids'            => 4,
            ],
            [
                'title'           => 'Quilla azul single — longboard',
                'slug_suffix'     => 'quilla-azul',
                'description'     => 'Single fin 8" para midlength/longboard. Fibra, sin grietas.',
                'category'        => AuctionCategory::Accessory,
                'image'           => 'img/tienda/demo/producto-quilla-azul.webp',
                'starting_cents'  => 3000,
                'increment_cents' => 200,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Settled,
                'payment_status'  => PaymentStatus::Confirmed,
                'starts_at'       => $now->copy()->subDays(30),
                'ends_at'         => $now->copy()->subDays(22),
                'settled_at'      => $now->copy()->subDays(21),
                'bids'            => 3,
            ],
            [
                'title'           => 'Tabla perfil midlength 7\'0"',
                'slug_suffix'     => 'midlength-perfil',
                'description'     => 'Midlength versátil, volumen generoso. Ideal progresión desde softboard.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-perfil.webp',
                'starting_cents'  => 28000,
                'increment_cents' => 1000,
                'reserve_cents'   => 32000,
                'status'          => AuctionStatus::Settled,
                'payment_status'  => PaymentStatus::Confirmed,
                'starts_at'       => $now->copy()->subDays(40),
                'ends_at'         => $now->copy()->subDays(28),
                'settled_at'      => $now->copy()->subDays(26),
                'bids'            => 11,
            ],
            [
                'title'           => 'Quilla negra FCS — side bite',
                'slug_suffix'     => 'quilla-negra',
                'description'     => 'Par de side bites FCS, color negro. Poco uso.',
                'category'        => AuctionCategory::Accessory,
                'image'           => 'img/tienda/demo/producto-quilla-negra.webp',
                'starting_cents'  => 1800,
                'increment_cents' => 100,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Settled,
                'payment_status'  => PaymentStatus::Confirmed,
                'starts_at'       => $now->copy()->subDays(14),
                'ends_at'         => $now->copy()->subDays(7),
                'settled_at'      => $now->copy()->subDays(6),
                'bids'            => 2,
            ],

            // ── 5 aún no empezadas (borrador / programadas) ─────────
            [
                'title'           => 'Occy bottom 6\'4" — próxima tanda',
                'slug_suffix'     => 'occy-proxima',
                'description'     => 'Lote programado. Publicación prevista la próxima semana. Inspección en club antes de abrir pujas.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-occy-bottom.webp',
                'starting_cents'  => 22000,
                'increment_cents' => 750,
                'reserve_cents'   => 26000,
                'status'          => AuctionStatus::Draft,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->addDays(3),
                'ends_at'         => $now->copy()->addDays(10),
                'settled_at'      => null,
                'bids'            => 0,
            ],
            [
                'title'           => 'Neopreno invierno 5/4 — talla L',
                'slug_suffix'     => 'neo-invierno',
                'description'     => 'Próxima subasta de material de invierno. Reserva tu alerta: solo socios VIP / taquilla.',
                'category'        => AuctionCategory::Wetsuit,
                'image'           => 'img/tienda/demo/producto-neopreno.webp',
                'starting_cents'  => 12000,
                'increment_cents' => 500,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Draft,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->addDays(5),
                'ends_at'         => $now->copy()->addDays(12),
                'settled_at'      => null,
                'bids'            => 0,
            ],
            [
                'title'           => 'Pack leash + wax + invento',
                'slug_suffix'     => 'pack-accesorios',
                'description'     => 'Lote combo de accesorios. Se abre en cuanto cierre la tanda actual en vivo.',
                'category'        => AuctionCategory::Accessory,
                'image'           => 'img/tienda/demo/producto-invento.webp',
                'starting_cents'  => 3500,
                'increment_cents'  => 200,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Draft,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->addDays(2),
                'ends_at'         => $now->copy()->addDays(7),
                'settled_at'      => null,
                'bids'            => 0,
            ],
            [
                'title'           => 'Lost Round Nose Fish 5\'8"',
                'slug_suffix'     => 'lost-rnf-draft',
                'description'     => 'RNF en cola de publicación. Fotos y medidas finales pendientes de validar en admin.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-lost-blanca.webp',
                'starting_cents'  => 30000,
                'increment_cents' => 1000,
                'reserve_cents'   => 35000,
                'status'          => AuctionStatus::Draft,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->addDays(7),
                'ends_at'         => $now->copy()->addDays(14),
                'settled_at'      => null,
                'bids'            => 0,
            ],
            [
                'title'           => 'Gong Egg 6\'8" — soft top',
                'slug_suffix'     => 'gong-egg-draft',
                'description'     => 'Egg soft top para olas pequeñas. Programada para el próximo ciclo de subastas del club.',
                'category'        => AuctionCategory::Surfboard,
                'image'           => 'img/tienda/demo/tabla-gong-negra.webp',
                'starting_cents'  => 16000,
                'increment_cents' => 500,
                'reserve_cents'   => null,
                'status'          => AuctionStatus::Draft,
                'payment_status'  => null,
                'starts_at'       => $now->copy()->addDays(8),
                'ends_at'         => $now->copy()->addDays(15),
                'settled_at'      => null,
                'bids'            => 0,
            ],
        ];
    }
}
