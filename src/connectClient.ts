import * as Debug from 'debug';
import * as pg from 'pg';
import Client, { IsolationMode } from './client';
import { convertPgError, getDbErrorCode, DbErrorCode } from './errors';
import { Query } from './query';

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
   * Make a query in the database.
   * @param query the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  async query<T>(query: string, values?: any[]): Promise<T[]>;

  /**
   * Make a query in the database.
   * @param query the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  async query<T>(query: Query<T>): Promise<T[]>;

  /**
   * Make a query in the database.
   * @param cmd the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  async query<T>(query: string | Query<T>, values?: any[]): Promise<T[]> {
    return await this.open(async client => {
      if (typeof query === 'string') {
        query = {
          query: query,
          values: values,
        };
      }
      debug(query.query);
      const result = await client.query(query.query, query.values);
      return result.rows;
    });
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
