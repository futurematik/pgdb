import * as Debug from 'debug';
import * as pg from 'pg';
import Client, { IsolationMode } from './client';
import { convertPgError, getDbErrorCode, DbErrorCode } from './errors';
import ColumnMap from './columnMap';

const debug = Debug('pgdatabase:dbclient');
const deadlockRetries = 10;
const deadlockRetryDelayMs = 10;

/**
 * Client provides methods to query the database.
 */
export default class ConnectClient implements Client {
  constructor(
    private connect: () => Promise<pg.ClientBase>,
    private release?: (client: pg.ClientBase) => void,
  ) {}

  /**
   * Insert a value into the database.
   * @param table name of the table to insert into.
   * @param map a column map.
   * @param value the entity to insert.
   */
  async insert<T>(
    table: string,
    map: ColumnMap<keyof T>,
    value: T,
  ): Promise<void> {
    await this.query(
      `INSERT INTO ${table} (${map.columns()}) VALUES(${map.placeholders()})`,
      map.values(value),
    );
  }

  /**
   * Make a query in the database.
   * @param cmd the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  async query<T>(cmd: string, values?: any[]): Promise<T[]> {
    return await this.open(async client => {
      debug(cmd);
      const result = await client.query(cmd, values);
      return result.rows;
    });
  }

  /**
   * Run a SELECT query in the database.
   * @param table the table to select from
   * @param map the column map
   * @param filter an object with values to filter by
   */
  async select<T>(
    table: string,
    map: ColumnMap<keyof T>,
    filter?: Partial<T>,
  ): Promise<T[]> {
    let sql = `SELECT ${map.aliasedColumns()} FROM ${table}`;
    let values: any[] | undefined;

    if (filter) {
      const filterMap = map.pick(...(<(keyof T)[]>Object.keys(filter)));
      sql += ' WHERE ' + filterMap.assignments();
      values = filterMap.values(filter);
    }

    return await this.query<T>(sql, values);
  }

  /**
   * Wrap a set of queries in a transaction that will be automatically committed
   * on success or rolled back on error.
   * @param callback a function that will be provided the client for the queries.
   */
  async transaction<T>(
    callback: (client: Client) => Promise<T>,
    isolation?: IsolationMode,
  ): Promise<T> {
    const mode = isolation || IsolationMode.Serializable;

    return this.open(async client => {
      let i = 0;
      while (true) {
        try {
          debug(`begin transaction (isolation = ${mode})`);
          await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${mode}`);

          const result = await callback(
            new ConnectClient(() => Promise.resolve(client)),
          );

          debug('commit transaction');
          await client.query('COMMIT');

          return result;
        } catch (e) {
          await client.query('ROLLBACK');

          const errCode = getDbErrorCode(e);

          // retry failed transactions
          if (
            errCode === DbErrorCode.DeadlockDetected ||
            errCode === DbErrorCode.SerializationFailure
          ) {
            debug('deadlock/serialization failure');
            if (++i <= deadlockRetries) {
              debug('will retry');
              await new Promise(resolve =>
                setTimeout(resolve, deadlockRetryDelayMs),
              );
              continue;
            }
          }
          throw e;
        }
      }
    });
  }

  /**
   * Update a value in the database.
   * @param table name of the table to upsert into.
   * @param map a column map.
   * @param value the entity to upsert.
   * @param keyField the name of the field which represents the unique key.
   * @param updateFields the names of the fields to update (defaults to all fields except key field).
   * @param returning true to return the updated fields.
   */
  update<T>(
    table: string,
    map: ColumnMap<keyof T>,
    value: T,
    keyFields: keyof T | (keyof T)[],
    updateFields?: (keyof T)[],
    returning?: false,
  ): Promise<void>;

  /**
   * Update a value in the database.
   * @param table name of the table to upsert into.
   * @param map a column map.
   * @param value the entity to upsert.
   * @param keyField the name of the field which represents the unique key.
   * @param updateFields the names of the fields to update (defaults to all fields except key field).
   * @param returning true to return the updated fields.
   */
  update<T>(
    table: string,
    map: ColumnMap<keyof T>,
    value: T,
    keyFields: keyof T | (keyof T)[],
    updateFields: undefined | (keyof T)[],
    returning: true,
  ): Promise<T[]>;
  async update<T>(
    table: string,
    map: ColumnMap<keyof T>,
    value: T,
    keyFields: keyof T | (keyof T)[],
    updateFields: undefined | (keyof T)[],
    returning?: boolean,
  ): Promise<T[] | void> {
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

    return await this.query<T>(
      `UPDATE ${table}
       SET ${updateMap.assignments()}
       WHERE ${keyMap.assignments()}
       ${ret}`,
      map.values(value),
    );
  }

  /**
   * Insert or update a value in the database.
   * @param table name of the table to upsert into.
   * @param map a column map.
   * @param value the entity to upsert.
   * @param keyField the name of the field which represents the unique key.
   * @param updateFields the names of the fields to update (defaults to all fields except key field).
   * @param returning true to return the updated fields.
   */
  upsert<T>(
    table: string,
    map: ColumnMap<keyof T>,
    value: T,
    keyField: keyof T,
    updateFields?: (keyof T)[],
    returning?: false,
  ): Promise<void>;

  /**
   * Insert or update a value in the database.
   * @param table name of the table to upsert into.
   * @param map a column map.
   * @param value the entity to upsert.
   * @param keyField the name of the field which represents the unique key.
   * @param updateFields the names of the fields to update (defaults to all fields except key field).
   * @param returning true to return the updated fields.
   */
  upsert<T>(
    table: string,
    map: ColumnMap<keyof T>,
    value: T,
    keyField: keyof T,
    updateFields: undefined | (keyof T)[],
    returning: true,
  ): Promise<T[]>;
  async upsert<T>(
    table: string,
    map: ColumnMap<keyof T>,
    value: T,
    keyField: keyof T,
    updateFields: undefined | (keyof T)[],
    returning?: boolean,
  ): Promise<void | T[]> {
    // make a map for the updated fields
    const updateMap =
      updateFields === undefined
        ? map.omitPreserveIndices(keyField)
        : map.pickPreserveIndices(...updateFields);

    const ret = returning ? `RETURNING ${map.aliasedColumns()}` : '';

    return await this.query<T>(
      `INSERT INTO ${table} (${map.columns()}) 
        VALUES (${map.placeholders()})
        ON CONFLICT (${keyField})
        DO UPDATE SET ${updateMap.assignments()}
        ${ret}`,
      map.values(value),
    );
  }

  /**
   * Open a connection to the database and release it when done.
   */
  private async open<T>(
    callback: (client: pg.ClientBase) => Promise<T>,
  ): Promise<T> {
    const client = await this.connect();

    try {
      return await callback(client);
    } catch (e) {
      debug('error on connection: %O', e);
      throw convertPgError(e);
    } finally {
      if (this.release) {
        this.release(client);
      }
    }
  }
}
