<?php

namespace Database\Seeders;

use App\Models\AutoCoachReferenceVideo;
use Illuminate\Database\Seeder;

class AutoCoachReferenceVideoSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['surf', 'goofy', 'air_360_backside', 'autocoach/videos/surf/goofy/air_360_backside.mp4'],
            ['surf', 'goofy', 'air_360_frontside', 'autocoach/videos/surf/goofy/air_360_frontside.mp4'],
            ['surf', 'goofy', 'air_360_frontside_medinav', 'autocoach/videos/surf/goofy/air_360_frontside_medina.mp4'],
            ['surf', 'goofy', 'air_revers_frontside', 'autocoach/videos/surf/goofy/air_revers_frontside.mp4'],
            ['surf', 'goofy', 'floater_backside', 'autocoach/videos/surf/goofy/floater_backside.mp4'],
            ['surf', 'goofy', 'floater_frontside', 'autocoach/videos/surf/goofy/floater_frontside.mp4'],
            ['surf', 'goofy', 'popup_frontside', 'autocoach/videos/surf/goofy/popup_frontside.mp4'],
            ['surf', 'goofy', 'revers360_backside_Yago', 'autocoach/videos/surf/goofy/revers360_backside_Yago.mp4'],
            ['surf', 'goofy', 'snap_frontside', 'autocoach/videos/surf/goofy/snap_frontside.mp4'],
            ['surf', 'regular', 'air_revers_frontside_kolohe', 'autocoach/videos/surf/regular/air_revers_frontside_kolohe.mp4'],
            ['surf', 'regular', 'airs_frontside', 'autocoach/videos/surf/regular/airs_frontside.mp4'],
            ['surf', 'regular', 'barrel_backside_kelly', 'autocoach/videos/surf/regular/barrel_backside_kelly.mp4'],
            ['surf', 'regular', 'barrel_frontside', 'autocoach/videos/surf/regular/barrel_frontside.mp4'],
            ['surf', 'regular', 'barrel_frontside_kelly', 'autocoach/videos/surf/regular/barrel_frontside_kelly.mp4'],
            ['surf', 'regular', 'carving_backside_julian', 'autocoach/videos/surf/regular/carving_backside_julian.mp4'],
            ['surf', 'regular', 'carving_frontside_etha_ewing', 'autocoach/videos/surf/regular/carving_frontside_etha_ewing.mp4'],
            ['surf', 'regular', 'carving_frontside_kolohe', 'autocoach/videos/surf/regular/carving_frontside_kolohe.mp4'],
            ['surf', 'regular', 'change_of_plane ', 'autocoach/videos/surf/regular/change_of_plane .mp4'],
            ['surf', 'regular', 'cutback_frontside_colapinto', 'autocoach/videos/surf/regular/cutback_frontside_colapinto.mp4'],
            ['surf', 'regular', 'cutback_frontside_ethan_ewing', 'autocoach/videos/surf/regular/cutback_frontside_ethan_ewing.mp4'],
            ['surf', 'regular', 'floater_frontside_foam_ethan_ewing', 'autocoach/videos/surf/regular/floater_frontside_foam_ethan_ewing.mp4'],
            ['surf', 'regular', 'floater_frontside_julian', 'autocoach/videos/surf/regular/floater_frontside_julian.mp4'],
            ['surf', 'regular', 'floater_frontside_kolohe_small_wave', 'autocoach/videos/surf/regular/floater_frontside_kolohe_small_wave.mp4'],
            ['surf', 'regular', 'layback', 'autocoach/videos/surf/regular/layback.mp4'],
            ['surf', 'regular', 'Layback_colapinto', 'autocoach/videos/surf/regular/Layback_colapinto.mp4'],
            ['surf', 'regular', 'pop_up_bottom_turn', 'autocoach/videos/surf/regular/pop_up_bottom_turn.mp4'],
            ['surf', 'regular', 'pumping_frontside_kolohe', 'autocoach/videos/surf/regular/pumping_frontside_kolohe.mp4'],
            ['surf', 'regular', 'snap_backside_julian', 'autocoach/videos/surf/regular/snap_backside_julian.mp4'],
            ['surf', 'regular', 'snap_frontside_small_wave_kolohe', 'autocoach/videos/surf/regular/snap_frontside_small_wave_kolohe.mp4'],
        ];

        foreach ($rows as [$sport, $posture, $trick, $path]) {
            AutoCoachReferenceVideo::updateOrCreate(
                ['sport' => $sport, 'posture' => $posture, 'trick' => $trick],
                ['file_path' => $path],
            );
        }
    }
}
