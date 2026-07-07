<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Services\VipStudentPerformanceService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyProfileController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isVip = (bool) ($user->is_vip ?? false);
        $bonoMonth = (string) $request->query('bono_month', now()->format('Y-m'));
        $loadHistory = $request->boolean('load_history', false);

        $performanceData = [
            'subject_user_id' => (int) $user->id,
            'activeBono' => null,
            'history' => null,
            'history_loaded' => false,
            'history_count' => 0,
            'attendanceMap' => [],
            'prediction' => null,
            'stats' => [
                'total_surfed_hours' => 0,
                'solo_ratio_percent' => 0,
                'level_progress' => 'Iniciación',
            ],
            'month' => $bonoMonth,
        ];

        if ($isVip) {
            $performanceData = VipStudentPerformanceService::buildPerformanceDataForSubject(
                $user,
                $bonoMonth,
                $loadHistory,
                false,
            );
        } else {
            $performanceData = VipStudentPerformanceService::buildPerformanceData(
                $user,
                $bonoMonth,
                $loadHistory,
                false,
            );
        }

        return Inertia::render('User/Dashboard/MyProfile', [
            'performanceData' => $performanceData,
            'isVip' => $isVip,
        ]);
    }
}
