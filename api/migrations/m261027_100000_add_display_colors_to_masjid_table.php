<?php

use yii\db\Migration;

/**
 * Colours the masjid owner picks for the masjid's display screens (background, card, highlight),
 * stored as JSON. Null keeps the display's built-in themes.
 */
class m261027_100000_add_display_colors_to_masjid_table extends Migration
{
    public function safeUp()
    {
        $this->addColumn('{{%masjid}}', 'display_colors', $this->string(64)->null()->after('madhab'));
    }

    public function safeDown()
    {
        $this->dropColumn('{{%masjid}}', 'display_colors');
    }
}
