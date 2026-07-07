<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Vip\VipMembershipService;
use Illuminate\Console\Command;

class MakeUserVip extends Command
{
    protected $signature = 'user:make-vip {email : Email del usuario}';
    protected $description = 'Marca un usuario como VIP (is_vip = true) por email';

    public function __construct(
        private readonly VipMembershipService $vipMembershipService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        $user = User::query()->where('email', $email)->first();
        if (! $user) {
            $this->error("No existe un usuario con email: {$email}");
            return self::FAILURE;
        }

        if ((bool) $user->is_vip) {
            $this->info("Usuario {$user->email} ya era VIP.");
            return self::SUCCESS;
        }

        $updated = $this->vipMembershipService->activate($user);

        $this->info("Usuario {$updated->email} marcado como VIP correctamente.");

        return self::SUCCESS;
    }
}

