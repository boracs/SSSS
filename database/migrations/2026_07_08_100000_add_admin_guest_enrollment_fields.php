<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (! Schema::hasColumn('lessons', 'booker_first_name')) {
                $table->string('booker_first_name', 80)->nullable()->after('internal_notes');
            }
            if (! Schema::hasColumn('lessons', 'booker_last_name')) {
                $table->string('booker_last_name', 80)->nullable()->after('booker_first_name');
            }
            if (! Schema::hasColumn('lessons', 'booker_phone')) {
                $table->string('booker_phone', 40)->nullable()->after('booker_last_name');
            }
        });

        Schema::table('lesson_user', function (Blueprint $table) {
            if (! Schema::hasColumn('lesson_user', 'guest_first_name')) {
                $table->string('guest_first_name', 80)->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('lesson_user', 'guest_last_name')) {
                $table->string('guest_last_name', 80)->nullable()->after('guest_first_name');
            }
            if (! Schema::hasColumn('lesson_user', 'guest_phone')) {
                $table->string('guest_phone', 40)->nullable()->after('guest_last_name');
            }
            if (! Schema::hasColumn('lesson_user', 'guest_email')) {
                $table->string('guest_email', 120)->nullable()->after('guest_phone');
            }
            if (! Schema::hasColumn('lesson_user', 'is_admin_guest')) {
                $table->boolean('is_admin_guest')->default(false)->after('guest_email');
            }
        });

        if ($this->hasIndex('lesson_user', 'lesson_user_lesson_id_user_id_unique')) {
            Schema::table('lesson_user', function (Blueprint $table) {
                $table->index('lesson_id', 'lesson_user_lesson_id_index');
            });

            Schema::table('lesson_user', function (Blueprint $table) {
                $table->dropUnique(['lesson_id', 'user_id']);
            });
        }

        if (! $this->hasForeignKey('lesson_user', 'lesson_user_user_id_foreign')) {
            Schema::table('lesson_user', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->change();
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if ($this->hasForeignKey('lesson_user', 'lesson_user_user_id_foreign')) {
            Schema::table('lesson_user', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
        }

        if (! $this->hasIndex('lesson_user', 'lesson_user_lesson_id_user_id_unique')) {
            Schema::table('lesson_user', function (Blueprint $table) {
                $table->unique(['lesson_id', 'user_id']);
            });
        }

        if ($this->hasIndex('lesson_user', 'lesson_user_lesson_id_index')) {
            Schema::table('lesson_user', function (Blueprint $table) {
                $table->dropIndex('lesson_user_lesson_id_index');
            });
        }

        Schema::table('lesson_user', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_user', 'is_admin_guest')) {
                $table->dropColumn('is_admin_guest');
            }
            if (Schema::hasColumn('lesson_user', 'guest_email')) {
                $table->dropColumn('guest_email');
            }
            if (Schema::hasColumn('lesson_user', 'guest_phone')) {
                $table->dropColumn('guest_phone');
            }
            if (Schema::hasColumn('lesson_user', 'guest_last_name')) {
                $table->dropColumn('guest_last_name');
            }
            if (Schema::hasColumn('lesson_user', 'guest_first_name')) {
                $table->dropColumn('guest_first_name');
            }
        });

        Schema::table('lessons', function (Blueprint $table) {
            if (Schema::hasColumn('lessons', 'booker_phone')) {
                $table->dropColumn('booker_phone');
            }
            if (Schema::hasColumn('lessons', 'booker_last_name')) {
                $table->dropColumn('booker_last_name');
            }
            if (Schema::hasColumn('lessons', 'booker_first_name')) {
                $table->dropColumn('booker_first_name');
            }
        });
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $rows = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]);

        return count($rows) > 0;
    }

    private function hasForeignKey(string $table, string $constraintName): bool
    {
        $rows = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = ?',
            [$table, $constraintName, 'FOREIGN KEY']
        );

        return count($rows) > 0;
    }
};
