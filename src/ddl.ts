// this file contains DDL generation functions to help minimise mistakes.

export type TableItem = (table: string) => string;

export interface ColumnOptions {
  nullable?: boolean;
  primaryKey?: boolean;
  foreignTable?: string;
  foreignColumn?: string;
  unique?: boolean;
}

export function makePrimaryKeyName(table: string, column: string) {
  return `PK:${table}:${column}`;
}

export function makeUniqueConstraintName(table: string, column: string) {
  return `UQ:${table}:${column}`;
}

export function makeForeignKeyName(
  table: string,
  column: string,
  target: string,
) {
  return `FK:${table}:${column}:${target}`;
}

export function makeIndexName(table: string, ...columns: string[]) {
  return `IX:${table}:${columns.join(':')}`;
}

/**
 * Generates DDL for creating a table.
 */
export function createTable(name: string, ...items: TableItem[]) {
  const ddl = items.map(x => x(name)).join(', ');
  return `CREATE TABLE ${name} (${ddl})`;
}

/**
 * Generates DDL for creating an index.
 */
export function createIndex(table: string, ...columns: string[]) {
  return `CREATE INDEX ${makeIndexName(
    table,
    ...columns,
  )} ON ${table}(${columns.join(',')})`;
}

/**
 * Generates DDL for a column.
 */
export function column(
  name: string,
  type: string,
  config?: ColumnOptions,
): TableItem {
  return tableName => {
    config = config || {};
    let ddl = `"${name}" ${type} ${!config.nullable ? 'NOT' : ''} NULL`;

    if (config.primaryKey) {
      ddl += ` CONSTRAINT "${makePrimaryKeyName(tableName, name)}" PRIMARY KEY`;
    } else if (config.unique) {
      ddl += ` CONSTRAINT "${makeUniqueConstraintName(
        tableName,
        name,
      )}" UNIQUE`;
    }
    if (config.foreignTable) {
      ddl += ` CONSTRAINT "${makeForeignKeyName(
        tableName,
        name,
        config.foreignTable,
      )}" REFERENCES ${config.foreignTable}`;

      if (config.foreignColumn) {
        ddl += `("${config.foreignColumn}")`;
      }
    }
    return ddl;
  };
}
