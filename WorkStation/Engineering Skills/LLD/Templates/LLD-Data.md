# LLD — D-<TableName> (Data)

| Field | Value |
|---|---|
| **Mode** | As-built / Delta for <CR-nnn> |
| **Table** | `<table_name>` |
| **Yii2 model** | `api/models/<Model>.php` |
| **Migration** | `api/migrations/m<yymmdd_hhmmss>_<name>.php` / <MISSING> |
| **Managed by** | <API controller(s)>, <back-office screen(s)> |

## Columns

| Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|
| `id` | INT | No | AUTO_INCREMENT | PK | — |

## Relations

| Relation | Kind | Target | Model method |
|---|---|---|---|
| <name> | hasOne / hasMany | `<table>` | `get<Name>()` |

## Model Rules

| Attribute(s) | Yii2 rule | FDS ref |
|---|---|---|
| <attr> | `required` / `string, max=` / `integer` / … | <MOD>-VR-nn |

## SQL (new / changed tables only)

```sql
CREATE TABLE `<table_name>` (
  ...
);
```

## Data Migration

<How existing rows are handled by this change — or `None.`>
