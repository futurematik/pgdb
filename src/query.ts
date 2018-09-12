import { MoreThanOneDbError, NotFoundDbError } from './errors';
import ColumnMap from './columnMap';

/**
 * Query represents a command and values to be inserted.
 */
export interface Query<T> {
  query: string;
  values?: any[];
}

/**
 * Construct a SELECT query.
 * @param table the table to select from
 * @param map the column map
 * @param filter an object with values to filter by
 */
export function select<T>(
  table: string,
  map: ColumnMap<keyof T>,
  filter?: Partial<T>,
): Query<T> {
  let query = `SELECT ${map.aliasedColumns()} FROM ${table}`;
  let values: any[] | undefined;

  if (filter) {
    const filterMap = map.pick(...(<(keyof T)[]>Object.keys(filter)));
    query += ' WHERE ' + filterMap.assignments();
    values = filterMap.values(filter);
  }

  return { query, values };
}

/**
 * Construct an update statement.
 * @param table name of the table to upsert into.
 * @param map a column map.
 * @param value the entity to upsert.
 * @param keyField the name of the field which represents the unique key.
 * @param updateFields the names of the fields to update (defaults to all fields except key field).
 * @param returning true to return the updated fields.
 */
export function update<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  keyFields: keyof T | (keyof T)[],
  updateFields?: (keyof T)[],
  returning?: false,
): Query<void>;

/**
 * Construct an update statement.
 * @param table name of the table to upsert into.
 * @param map a column map.
 * @param value the entity to upsert.
 * @param keyField the name of the field which represents the unique key.
 * @param updateFields the names of the fields to update (defaults to all fields except key field).
 * @param returning true to return the updated fields.
 */
export function update<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  keyFields: keyof T | (keyof T)[],
  updateFields: undefined | (keyof T)[],
  returning: true,
): Query<T>;

/**
 * Construct an update statement.
 */
export function update<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  keyFields: keyof T | (keyof T)[],
  updateFields: undefined | (keyof T)[],
  returning?: boolean,
): Query<T> {
  if (!Array.isArray(keyFields)) {
    keyFields = [keyFields];
  }
  // make a map for the keys
  const keyMap = map.pickPreserveIndices(...keyFields);

  // make a map for the updated fields
  const updateMap =
    updateFields === undefined
      ? map.omitPreserveIndices(...keyFields)
      : map.pickPreserveIndices(...updateFields);

  const ret = returning ? `RETURNING ${map.aliasedColumns()}` : '';

  return {
    query: `UPDATE ${table}
      SET ${updateMap.assignments()}
      WHERE ${keyMap.assignments()}
      ${ret}`,
    values: map.values(value),
  };
}

/**
 * Construct an insert statement.
 * @param table name of the table to insert into.
 * @param map a column map.
 * @param value the entity to insert.
 */
export function insert<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  returning: true,
): Query<T>;

/**
 * Construct an insert statement.
 * @param table name of the table to insert into.
 * @param map a column map.
 * @param value the entity to insert.
 */
export function insert<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  returning?: false,
): Query<void>;

export function insert<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  returning?: boolean,
): Query<void> {
  const ret = returning ? `RETURNING ${map.aliasedColumns()}` : '';

  return {
    query: `INSERT INTO ${table} (${map.columns()}) 
            VALUES(${map.placeholders()}) ${ret}`,
    values: map.values(value),
  };
}

/**
 * Construct an upsert statement.
 * @param table name of the table to upsert into.
 * @param map a column map.
 * @param value the entity to upsert.
 * @param keyField the name of the field which represents the unique key.
 * @param updateFields the names of the fields to update (defaults to all fields except key field).
 * @param returning true to return the updated fields.
 */
export function upsert<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  keyField: keyof T,
  updateFields?: (keyof T)[],
  returning?: false,
): Query<void>;

/**
 * Construct an upsert statement.
 * @param table name of the table to upsert into.
 * @param map a column map.
 * @param value the entity to upsert.
 * @param keyField the name of the field which represents the unique key.
 * @param updateFields the names of the fields to update (defaults to all fields except key field).
 * @param returning true to return the updated fields.
 */
export function upsert<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  keyField: keyof T,
  updateFields: undefined | (keyof T)[],
  returning: true,
): Query<T>;

/**
 * Construct an upsert statement.
 */
export function upsert<T>(
  table: string,
  map: ColumnMap<keyof T>,
  value: T,
  keyField: keyof T,
  updateFields: undefined | (keyof T)[],
  returning?: boolean,
): Query<T> {
  // make a map for the updated fields
  const updateMap =
    updateFields === undefined
      ? map.omitPreserveIndices(keyField)
      : map.pickPreserveIndices(...updateFields);

  const ret = returning ? `RETURNING ${map.aliasedColumns()}` : '';

  return {
    query: `INSERT INTO ${table} (${map.columns()}) 
      VALUES (${map.placeholders()})
      ON CONFLICT (${keyField})
      DO UPDATE SET ${updateMap.assignments()}
      ${ret}`,
    values: map.values(value),
  };
}

/**
 * Get the only result or throw an error if not precisely one result.
 */
export function single<T>(results: T[]): T {
  if (results.length > 1) {
    throw new MoreThanOneDbError();
  } else if (results.length === 0) {
    throw new NotFoundDbError();
  }
  return results[0];
}

/**
 * Get the only result, undefined if empty, or throw an error if more than one
 * result.
 */
export function singleOrNothing<T>(results: T[]): T | undefined {
  if (results.length > 1) {
    throw new MoreThanOneDbError();
  } else if (results.length === 0) {
    return;
  }
  return results[0];
}

/**
 * Get the first field of the only result row or throw an error if more than one
 * result.
 */
export function scalar<T>(results: T[]): T {
  const one = single(results);
  return <T>getFirstValue(one);
}

/**
 * Get the first field of the only result row, undefined if no rows, or throw an
 * error if more than one result. If there is more than one value in the row,
 * the choice of value is undefined.
 */
export function scalarOrNothing<T = any>(results: any[]): T | undefined {
  const one = singleOrNothing(results);
  if (one === undefined) {
    return;
  }
  return <T>getFirstValue(one);
}

/**
 * Get the first value in a row. If there is more than one value, behaviour is
 * undefined.
 */
function getFirstValue(obj: any) {
  const k = Object.keys(obj);
  if (!k.length) {
    return;
  }
  return obj[k[0]];
}
