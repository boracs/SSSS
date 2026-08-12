<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Config;

test('admin unverified can access panel when email verification requirement is disabled', function () {
    Config::set('auth.admin_require_email_verified', false);

    $admin = User::factory()->unverified()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.emergency-keys.index'))
        ->assertOk();
});

test('verified admin can access panel when email verification requirement is enabled', function () {
    Config::set('auth.admin_require_email_verified', true);
    Config::set('auth.admin_emergency_emails', []);

    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.emergency-keys.index'))
        ->assertOk();
});

test('unverified admin is redirected to verify email when requirement is enabled', function () {
    Config::set('auth.admin_require_email_verified', true);
    Config::set('auth.admin_emergency_emails', []);

    $admin = User::factory()->unverified()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.emergency-keys.index'))
        ->assertRedirect(route('verification.notice'));
});

test('unverified admin on emergency allowlist can access when requirement is enabled', function () {
    Config::set('auth.admin_require_email_verified', true);
    Config::set('auth.admin_emergency_emails', ['owner@s4.test']);

    $admin = User::factory()->unverified()->create([
        'role' => 'admin',
        'email' => 'owner@s4.test',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.emergency-keys.index'))
        ->assertOk();
});
