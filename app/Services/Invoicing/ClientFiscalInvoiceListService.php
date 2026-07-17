<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\DTOs\Invoicing\ClientFiscalInvoiceCategoryOptionDto;
use App\DTOs\Invoicing\ClientFiscalInvoiceListPageDto;
use App\DTOs\Invoicing\ClientFiscalInvoiceRowDto;
use App\Enums\Invoicing\FiscalInvoiceCategory;
use App\Models\Booking;
use App\Models\FiscalInvoice;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\User;
use App\Models\UserBono;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * "Mis facturas" del cliente: lista paginada de {@see FiscalInvoice} propias,
 * filtrable por {@see FiscalInvoiceCategory}. Ownership resuelto por
 * `user_id` del payable (mismo criterio que {@see FiscalInvoiceAccessService}).
 * Reutiliza {@see FiscalInvoiceAccessService::toPublicDto()} para status/PDF/QR
 * en vez de duplicar esa lógica.
 */
final class ClientFiscalInvoiceListService
{
    private const PER_PAGE = 15;

    public function __construct(
        private readonly FiscalInvoiceAccessService $access,
    ) {}

    public function paginate(User $user, ?string $categoryValue, int $page): ClientFiscalInvoiceListPageDto
    {
        $allCategories = FiscalInvoiceCategory::cases();
        $selected = $categoryValue !== null ? FiscalInvoiceCategory::tryFrom($categoryValue) : null;
        $categoriesToQuery = $selected !== null ? [$selected] : $allCategories;

        $ownedIdsByType = [];
        foreach ($categoriesToQuery as $category) {
            if (! $category->isEnabled()) {
                continue;
            }
            $ownedIdsByType[$category->payableType()] = $this->ownedPayableIds($category, $user);
        }

        $query = FiscalInvoice::query();
        $hasAnyOwnedId = array_sum(array_map(fn (array $ids): int => count($ids), $ownedIdsByType)) > 0;

        if (! $hasAnyOwnedId) {
            $query->whereRaw('1 = 0');
        } else {
            $query->where(function (Builder $outer) use ($ownedIdsByType): void {
                foreach ($ownedIdsByType as $payableType => $ids) {
                    if ($ids === []) {
                        continue;
                    }
                    $outer->orWhere(function (Builder $inner) use ($payableType, $ids): void {
                        $inner->where('payable_type', $payableType)->whereIn('payable_id', $ids);
                    });
                }
            });
        }

        /** @var LengthAwarePaginator<int, FiscalInvoice> $paginator */
        $paginator = $query->orderByDesc('id')->paginate(self::PER_PAGE, ['*'], 'page', max(1, $page));
        $paginator->getCollection()->loadMorph('payable', [
            Pedido::class     => [],
            UserBono::class   => ['pack'],
            Booking::class    => ['surfboard'],
            LessonUser::class => ['lesson'],
            PagoCuota::class  => ['plan'],
        ]);

        $items = $paginator->getCollection()
            ->map(fn (FiscalInvoice $invoice): ClientFiscalInvoiceRowDto => $this->toRowDto($invoice))
            ->all();

        $categoryOptions = array_map(
            fn (FiscalInvoiceCategory $c): ClientFiscalInvoiceCategoryOptionDto => new ClientFiscalInvoiceCategoryOptionDto(
                value: $c->value,
                label: $c->label(),
                enabled: $c->isEnabled(),
            ),
            $allCategories,
        );

        return new ClientFiscalInvoiceListPageDto(
            items: $items,
            categories: $categoryOptions,
            selectedCategory: $selected?->value ?? 'all',
            currentPage: $paginator->currentPage(),
            lastPage: $paginator->lastPage(),
            total: $paginator->total(),
            perPage: $paginator->perPage(),
        );
    }

    /** @return list<int> */
    private function ownedPayableIds(FiscalInvoiceCategory $category, User $user): array
    {
        $modelClass = $category->payableType();

        return $modelClass::query()
            ->where('user_id', $user->id)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }

    private function toRowDto(FiscalInvoice $invoice): ClientFiscalInvoiceRowDto
    {
        $category = FiscalInvoiceCategory::fromPayableType($invoice->payable_type);
        $publicDto = $this->access->toPublicDto($invoice);

        return new ClientFiscalInvoiceRowDto(
            id: $publicDto->id,
            category: $category?->value ?? 'otros',
            categoryLabel: $category?->label() ?? 'Otros',
            description: $this->describePayable($invoice),
            amountCents: $publicDto->amountCents,
            status: $invoice->status->value,
            statusLabel: $publicDto->statusLabel,
            isReady: $publicDto->isReady,
            detailUrl: $publicDto->detailUrl,
            pdfUrl: $publicDto->pdfUrl,
            issuedAt: $invoice->issued_at?->toIso8601String(),
            createdAt: $invoice->created_at?->toIso8601String() ?? '',
        );
    }

    private function describePayable(FiscalInvoice $invoice): string
    {
        $payable = $invoice->payable;

        return match (true) {
            $payable instanceof Pedido => "Pedido #{$payable->id}",
            $payable instanceof UserBono => sprintf('Bono %s', $payable->sku ?: '#'.$payable->id),
            $payable instanceof Booking => 'Alquiler '.($payable->surfboard?->name ?? 'tabla de surf'),
            $payable instanceof LessonUser => $payable->lesson?->title ?: 'Clase de surf',
            $payable instanceof PagoCuota => 'Taquilla — '.($payable->plan?->nombre ?? 'Plan de taquilla'),
            default => 'Compra #'.$invoice->payable_id,
        };
    }
}
