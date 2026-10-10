<?php

use yii\db\Migration;

/**
 * Masjid madhab (hanafi/shafi), photo gallery, and versioned salah timings.
 *
 * Every timing change (manual edit, timing-board capture, restore, admin edit) writes a full
 * snapshot to masjid_timing_version, so any earlier set can be restored. masjid_timing keeps
 * holding the current set, so existing readers are unchanged.
 */
class m261007_100000_add_masjid_madhab_images_timing_versions extends Migration
{
    public function safeUp()
    {
        $this->addColumn('{{%masjid}}', 'madhab', $this->string(10)->null()->after('country'));

        $this->createTable('{{%masjid_timing_version}}', [
            'id_masjid_timing_version' => $this->primaryKey(),
            'id_masjid' => $this->integer()->notNull(),
            'version_no' => $this->integer()->notNull(),
            // JSON array of {salah, azan, jamat}, in display order.
            'timings' => $this->text()->notNull(),
            // manual | capture | restore | admin | initial
            'source' => $this->string(20)->notNull()->defaultValue('manual'),
            // The timing-board photo this version was read from (capture only).
            'image_url' => $this->string(500)->null(),
            'restored_from' => $this->integer()->null(),
            'id_customer' => $this->integer()->null(),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('idx-masjid-timing-version-masjid-no', '{{%masjid_timing_version}}', ['id_masjid', 'version_no'], true);
        $this->addForeignKey(
            'fk-masjid-timing-version-masjid',
            '{{%masjid_timing_version}}',
            'id_masjid',
            '{{%masjid}}',
            'id',
            'CASCADE',
            'CASCADE'
        );

        $this->createTable('{{%masjid_image}}', [
            'id_masjid_image' => $this->primaryKey(),
            'id_masjid' => $this->integer()->notNull(),
            'image_url' => $this->string(500)->notNull(),
            'thumb_url' => $this->string(500)->notNull(),
            'width' => $this->integer()->notNull(),
            'height' => $this->integer()->notNull(),
            'size_bytes' => $this->integer()->notNull(),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
            'id_customer' => $this->integer()->null(),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('idx-masjid-image-masjid', '{{%masjid_image}}', 'id_masjid');
        $this->addForeignKey(
            'fk-masjid-image-masjid',
            '{{%masjid_image}}',
            'id_masjid',
            '{{%masjid}}',
            'id',
            'CASCADE',
            'CASCADE'
        );

        // Version 1 for every masjid that already has timings, so the first edit is restorable.
        $rows = (new \yii\db\Query())
            ->select(['id_masjid', 'salah', 'azan_time', 'jamat_time'])
            ->from('{{%masjid_timing}}')
            ->orderBy(['id_masjid' => SORT_ASC, 'sort_order' => SORT_ASC, 'id_masjid_timing' => SORT_ASC])
            ->all($this->db);

        $byMasjid = [];
        foreach ($rows as $row) {
            $byMasjid[(int)$row['id_masjid']][] = [
                'salah' => (string)$row['salah'],
                'azan' => (string)($row['azan_time'] ?? ''),
                'jamat' => (string)($row['jamat_time'] ?? ''),
            ];
        }

        foreach ($byMasjid as $masjidId => $timings) {
            $this->insert('{{%masjid_timing_version}}', [
                'id_masjid' => $masjidId,
                'version_no' => 1,
                'timings' => json_encode($timings, JSON_UNESCAPED_UNICODE),
                'source' => 'initial',
            ]);
        }
    }

    public function safeDown()
    {
        $this->dropTable('{{%masjid_image}}');
        $this->dropTable('{{%masjid_timing_version}}');
        $this->dropColumn('{{%masjid}}', 'madhab');
    }
}
