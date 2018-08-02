# pgdatabase

## What?

An **UNFINISHED** micro-ORM for Postgres.

## Why?

For when you want to write code for the platform you're targeting, rather than fighting an abstraction that lets you target all the database engines you will never use while trading off on flexibility and access to database features.

## How?

Install with yarn:

    yarn add @fmtk/pgdb

Or, install with npm:

    npm install --save @fmtk/pgdb

## Types definitions?

Included.

## Details

### Database

Create an instance:

```typescript
const db = new Database(
  connectionStringOrConfig, // null to get from env
  'migrationNamespace', // e.g. name of app
  migrations, // array of Migration objects
);
```

Initialise:

```typescript
// update to latest (run migrations)
await db.init(true);
```

Make a query:

```typescript
const results = db.connection.query<Foo>('SELECT * FROM foo');
```

### Column Maps

Create a model interface:

```typescript
interface Customer {
  id: int;
  name: string;
  email: string;
  mobile: string;
}
```

Create a column map:

```typescript
const customerMap = new ColumnMap<keyof Customer>({
  id: 'id',
  name: 'name',
  email: 'email',
  mobile: 'mobile',
});
```

Auto-generate SQL:

```typescript
const customer = await db.connection.Select<Customer>(
  'customers',
  customerMap,
  { id: 4 },
  true, // single
  true, // throwIfEmpty
);
// typeof customer is Customer.
```

### Migrations

The migration system will create a table as follows, where `NAMESPACE` is provided when the `Database` class is initialised:

```sql
CREATE TABLE ___NAMESPACE_migrations (
  id int NOT NULL PRIMARY KEY,
  at timestamp NOT NULL
    DEFAULT (NOW() AT TIME ZONE 'utc'),
  hash text NOT NULL
)
```

This table stores migrations that have been applied, along with time of migration and a hash of all the DDL that was executed. When the `Database` class is first initialised, it will check the migrations table and throw an error if the migrations have changed.

A migration looks like this:

```typescript
const migration = new Migration(1, [
  `CREATE TABLE foo (
    id int primary key,
    value text not null
  )`,
  `CREATE IX_value INDEX ON foo(value)`,
  // ... more DDL
]);
```

For convenience, DDL can be generated using the DDL methods:

```typescript
const migration = new Migration(1, [
  createTable(
    'foo',
    column('id', 'int', { primaryKey: true }),
    column('value', 'text', { nullable: true }),
  ),
  createIndex('foo', 'value'),
  // ... more DDL
]);
```

Constraints and indices generated using the DDL methods will have auto-generated names:

| Type              | Format                                 |
| ----------------- | -------------------------------------- |
| Primary key       | `PK:table:column`                      |
| Unique constraint | `UQ:table:column`                      |
| Foreign key       | `FK:table:column:target`               |
| Index             | `IX:table:column1:column2:...:columnN` |

These names can be generated using the following functions:

- `makePrimaryKeyName`
- `makeUniqueConstraintName`
- `makeForeignKeyName`
- `makeIndexName`
