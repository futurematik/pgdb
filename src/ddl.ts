// this file contains DDL generation functions to help minimise mistakes.

export type TableItem = (table: string) => string;

export interface ColumnOptions {
  nullable?: boolean;
  primaryKey?: boolean;
  foreignTable?: string;
  foreignColumn?: string;
  unique?: boolean;
}

export function makePrimaryKeyName(table: string, ...columns: string[]) {
  return `PK:${table}:${columns.join(':')}`;
}

export function makeUniqueConstraintName(table: string, ...column: string[]) {
  return `UQ:${table}:${column}`;
}

export function makeForeignKeyName(
  table: string,
  columns: string | string[],
  target: string,
) {
  const cols = Array.isArray(columns) ? columns.join(':') : columns;
  return `FK:${table}:${cols}:${target}`;
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

export function primaryKey(columns: string[]): TableItem {
  return tableName =>
    `CONSTRAINT "${makePrimaryKeyName(tableName, ...columns)}"
      PRIMARY KEY (${columns.join(',')})`;
}

export function unique(columns: string[]): TableItem {
  return tableName =>
    `CONSTRAINT "${makeUniqueConstraintName(tableName, ...columns)}"
      UNIQUE (${columns.join(',')})`;
}

export function foreignKey(
  target: string,
  columns: string[],
  targetColumns: string[],
): TableItem {
  return tableName =>
    `CONSTRAINT "${makeForeignKeyName(tableName, columns, target)}"
      FOREIGN KEY (${columns.join(',')}) 
      REFERENCES ${target} (${targetColumns.join(',')})`;
}
