import ColumnMap from './columnMap';

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
   * Insert a value into the database.
   * @param table name of the table to insert into.
   * @param map a column map.
   * @param value the entity to insert.
   */
  insert<T extends string>(
    table: string,
    map: ColumnMap<T>,
    value: Partial<Record<T, any>>,
  ): Promise<void>;

  /**
   * Make a query in the database.
   * @param cmd the SQL to execute.
   * @param values optional values to insert into the provided SQL.
   */
  query<T>(cmd: string, values?: any[]): Promise<T[]>;

  /**
   * Run a SELECT query in the database.
   * @param table the table to select from
   * @param map the column map
   * @param filter an object with values to filter by
   */
  select<T>(
    table: string,
    map: ColumnMap<keyof T>,
    filter?: Partial<T>,
  ): Promise<T[]>;

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
}
