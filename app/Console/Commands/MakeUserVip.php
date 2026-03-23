<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeUserVip extends Command
{
    protected $signature = 'user:make-vip {email : Email del usuario}';
    protected $description = 'Marca un usuario como VIP (is_vip = true) por email';

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        $user = User::query()->where('email', $email)->first();
        if (! $user) {
            $this->error("No existe un usuario con email: {$email}");
            return self::FAILURE;
        }

        $user->is_vip = true;
        $user->save();

        $this->info("Usuario {$user->email} marcado como VIP correctamente.");
        return self::SUCCESS;
    }
}

