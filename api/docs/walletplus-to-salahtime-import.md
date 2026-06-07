# Wallet Plus to Salah Time import

This repo already uses the same `bt_` community tables found in the Wallet Plus dump, so the safest one-time migration is:

1. Restore the Wallet Plus `.sql` file into a temporary database.
2. Backup the current `salahtime` database.
3. Copy only the community tables from the temporary database into `salahtime`.

## Source file

Wallet Plus dump:

`C:\Users\Fareed\Downloads\u596948110_wp_prod (3).sql`

## Tables that already match Salah Time

These tables exist in the dump and also exist in this API schema:

- `bt_customer`
- `bt_customer_type`
- `bt_masjid`
- `bt_halqa`
- `bt_halqa_masjid`
- `bt_program`
- `bt_program_customer`
- `bt_member`
- `bt_subscriber_packets`
- `bt_ramadan_sehri_subscription`

If you want only masjid / halqa / program subscription data, import only those tables plus `bt_customer`.

## Recommended approach

### 1. Create a temporary database

Run this in MySQL:

```sql
CREATE DATABASE walletplus_import CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Import the SQL dump into the temporary database

From PowerShell:

```powershell
mysql -u root walletplus_import < "C:\Users\Fareed\Downloads\u596948110_wp_prod (3).sql"
```

### 3. Backup the current Salah Time database

From PowerShell:

```powershell
mysqldump -u root salahtime > "D:\xampp\htdocs\salah-time\api\runtime\salahtime-before-walletplus-import.sql"
```

### 4. Copy the data into Salah Time

Open MySQL and run this script:

```sql
USE salahtime;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE bt_program_customer;
TRUNCATE TABLE bt_subscriber_packets;
TRUNCATE TABLE bt_member;
TRUNCATE TABLE bt_halqa_masjid;
TRUNCATE TABLE bt_program;
TRUNCATE TABLE bt_masjid;
TRUNCATE TABLE bt_halqa;
TRUNCATE TABLE bt_ramadan_sehri_subscription;
TRUNCATE TABLE bt_customer;
TRUNCATE TABLE bt_customer_type;

INSERT INTO bt_customer_type SELECT * FROM walletplus_import.bt_customer_type;
INSERT INTO bt_customer SELECT * FROM walletplus_import.bt_customer;
INSERT INTO bt_halqa SELECT * FROM walletplus_import.bt_halqa;
INSERT INTO bt_masjid SELECT * FROM walletplus_import.bt_masjid;
INSERT INTO bt_halqa_masjid SELECT * FROM walletplus_import.bt_halqa_masjid;
INSERT INTO bt_program SELECT * FROM walletplus_import.bt_program;
INSERT INTO bt_program_customer SELECT * FROM walletplus_import.bt_program_customer;
INSERT INTO bt_member SELECT * FROM walletplus_import.bt_member;
INSERT INTO bt_subscriber_packets SELECT * FROM walletplus_import.bt_subscriber_packets;
INSERT INTO bt_ramadan_sehri_subscription SELECT * FROM walletplus_import.bt_ramadan_sehri_subscription;

SET FOREIGN_KEY_CHECKS = 1;
```

## Important notes

- Do not import the whole Wallet Plus database into `salahtime` directly unless you also want finance tables like expenses, cards, budget planner, and categories.
- Importing through Yii models is not recommended for this one-time job because the `Customer` model hashes passwords on save. Raw SQL preserves the existing customer records exactly.
- The dump already contains explicit customer IDs, program IDs, halqa IDs, and masjid IDs, so copying these tables together preserves the relationships.
- If `bt_customer` in your local `salahtime` DB already contains new users created after Wallet Plus, do not `TRUNCATE` blindly. In that case, do a merge strategy instead of a full replace.

## If you want a merge instead of full replace

Use this pattern table by table:

```sql
INSERT INTO bt_customer (...)
SELECT ...
FROM walletplus_import.bt_customer s
WHERE NOT EXISTS (
    SELECT 1
    FROM bt_customer t
    WHERE t.id = s.id
       OR t.phone = s.phone
       OR t.email = s.email
);
```

That merge path needs table-specific mapping rules, especially for:

- duplicate customer IDs
- duplicate phone numbers
- duplicate email addresses
- records already created in Salah Time after the fork

## Suggested order if you want only community data

1. `bt_customer_type`
2. `bt_customer`
3. `bt_halqa`
4. `bt_masjid`
5. `bt_halqa_masjid`
6. `bt_program`
7. `bt_program_customer`
8. `bt_member`
9. `bt_subscriber_packets`
10. `bt_ramadan_sehri_subscription`

