import { Query } from './query';

/**
 * IsolationMode is the extent to which a transaction is isolated from other
 * in-progress transactions.
 * See https://www.postgresql.org/docs/current/static/transaction-iso.html.
 */
export enum IsolationMode {
  Serializable = 'SERIALIZABLE',
  RepeatableRead = 'REPEATABLE READ',
  ReadCommitted = 'READ COMMITTED',
  ReadUncomitted = 'READ UNCOMITTED',
}

export default interface Client {
  /**
   * Make a query in the database.
   * @param query the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  query<T>(query: string, values?: any[]): Promise<T[]>;

  /**
   * Make a query in the database.
   * @param query the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  query<T>(query: Query<T>): Promise<T[]>;

  /**
   * Make a query in the database.
   * @param cmd the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  query<T>(query: string | Query<T>, values?: any[]): Promise<T[]>;

  /**
   * Wrap a set of queries in a transaction that will be automatically committed
   * on success or rolled back on error.  Defaults to SERIALIZABLE isolation.
   * @param callback a function that will be provided the client for the queries
   * @param isolation the extent to which the transaction is isolated from other transactions
   */
  transaction<T>(
    callback: (client: Client) => Promise<T>,
    isolation?: IsolationMode,
  ): Promise<T>;
}
