<?php

use yii\db\Migration;
use yii\db\Query;

class m260605_103000_seed_sample_masjid_data extends Migration
{
    public function safeUp()
    {
        $existingMasjid = (new Query())
            ->from('{{%masjid}}')
            ->where(['name' => 'Masjid-e-Noor'])
            ->one();

        if ($existingMasjid) {
            return;
        }

        $ownerId = (new Query())
            ->from('{{%customer}}')
            ->select('id')
            ->orderBy(['id' => SORT_ASC])
            ->scalar();

        $now = date('Y-m-d H:i:s');

        $this->insert('{{%masjid}}', [
            'name' => 'Masjid-e-Noor',
            'address' => '12 Market Road, Mehdipatnam',
            'area' => 'Mehdipatnam',
            'city' => 'Hyderabad',
            'state' => 'Telangana',
            'pincode' => '500028',
            'country' => 'India',
            'status' => 1,
            'id_customer' => $ownerId ?: null,
            'id_halqa' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $masjidId = (int) $this->db->getLastInsertID();

        $this->insert('{{%masjid_detail}}', [
            'id_masjid' => $masjidId,
            'email' => 'masjid.noor@example.com',
            'contact' => '+91 98765 43210',
            'location' => '12 Market Road, Mehdipatnam, Hyderabad',
            'temperature' => '29 C',
            'qr_code_url' => 'https://example.com/sample-qr',
            'qr_approved' => 1,
            'qr_approved_by' => 'Masjid Committee',
            'stay_nearby' => 1,
            'ladies_jamat' => 1,
            'ladies_ramzan_access' => 1,
            'wazu_khana' => 1,
            'toilet' => 1,
            'gusl_khana' => 1,
            'air_conditioners' => 1,
            'chairs' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $committeeMembers = [
            ['name' => 'Abdul Rahman', 'role' => 'President', 'phone' => '+91 90000 11111'],
            ['name' => 'Mohammed Arif', 'role' => 'Secretary', 'phone' => '+91 90000 22222'],
            ['name' => 'Syed Imran', 'role' => 'Treasurer', 'phone' => '+91 90000 33333'],
        ];

        foreach ($committeeMembers as $index => $member) {
            $this->insert('{{%masjid_committee_member}}', [
                'id_masjid' => $masjidId,
                'name' => $member['name'],
                'role' => $member['role'],
                'phone' => $member['phone'],
                'sort_order' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $timings = [
            ['salah' => 'Fajr', 'azan_time' => '05:00 AM', 'jamat_time' => '05:30 AM'],
            ['salah' => 'Dhuhr', 'azan_time' => '01:05 PM', 'jamat_time' => '01:25 PM'],
            ['salah' => 'Asr', 'azan_time' => '04:45 PM', 'jamat_time' => '05:00 PM'],
            ['salah' => 'Maghrib', 'azan_time' => '06:42 PM', 'jamat_time' => '06:47 PM'],
            ['salah' => 'Isha', 'azan_time' => '08:05 PM', 'jamat_time' => '08:25 PM'],
            ['salah' => 'Juma', 'azan_time' => '01:15 PM', 'jamat_time' => '01:35 PM'],
        ];

        foreach ($timings as $index => $timing) {
            $this->insert('{{%masjid_timing}}', [
                'id_masjid' => $masjidId,
                'salah' => $timing['salah'],
                'azan_time' => $timing['azan_time'],
                'jamat_time' => $timing['jamat_time'],
                'sort_order' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function safeDown()
    {
        $masjid = (new Query())
            ->from('{{%masjid}}')
            ->where(['name' => 'Masjid-e-Noor'])
            ->one();

        if (!$masjid) {
            return;
        }

        $this->delete('{{%masjid}}', ['id' => $masjid['id']]);
    }
}
