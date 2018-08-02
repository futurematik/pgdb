import * as Debug from 'debug';
import * as pg from 'pg';
import Migration from './migration';
import Client from './client';
import ConnectClient from './connectClient';

const debug = Debug('pgdatabase:database');

/**
 * ConnectionConfig describes how to connect to the database.
 */
export interface ConnectionConfig {
  user?: string;
  database?: string;
  password?: string;
  port?: number;
  host?: string;
  connectionString?: string;
}

/**
 * The database status is as follows:
 * - empty: the migration table doesn't exist
 * - needsUpgrade: the database exists but there are outstanding migrations
 * - upToDate: all migrations have been applied
 */
export enum DatabaseStatus {
  Empty = 'empty',
  NeedsUpgrade = 'needsUpgrade',
  UpToDate = 'upToDate',
}

/**
 * Database class manages access to the database.
 */
export default class Database {
  private pool?: pg.Pool;
  private client?: Client;
  private config?: ConnectionConfig;

  /**
   * Create a new database instance.
   * @param config Connection string or config object.
   * @param migrationNamespace Namespace to form part of the migration table name.
   * @param migrations An array of DDL statements.
   */
  constructor(
    config: string | ConnectionConfig | undefined,
    private migrationNamespace: string,
    private migrations: Migration[],
  ) {
    if (typeof config === 'string') {
      this.config = { connectionString: config };
    } else {
      this.config = config;
    }

    // sense check provided migrations.
    for (let i = 0; i < this.migrations.length; ++i) {
      if (this.migrations[i].version != i + 1) {
        throw new Error(
          `expected migration ${i + 1} to have version ${i + 1}, got ${
            this.migrations[i].version
          }`,
        );
      }
    }
  }

  /**
   * Make the database available for connection by applying any outstanding
   * migrations.
   * @param updateToLatest True to automatically run the migrations (default false).
   * @returns A status indicating the current state of the database.
   */
  async init(updateToLatest?: boolean): Promise<DatabaseStatus> {
    debug('begin init database');

    // create the pool here so we get exceptions if not initialised.
    this.pool = new pg.Pool(this.config);

    // TODO: is there something nicer to do here?
    this.pool.on('error', err => {
      console.error('unexpected error on idle client', err);
      process.exit(-1);
    });

    this.client = new ConnectClient(this.poolConnect, client =>
      (client as pg.PoolClient).release(),
    );

    const empty = !(await this.migrationTablePresent());

    // jump out early if the migration table isn't even there.
    if (empty && !updateToLatest) {
      debug('empty database');
      return DatabaseStatus.Empty;
    }

    await this.ensureMigrationsTable();

    // get applied migrations
    const results = await this.connection.query<{ id: number }>(
      `SELECT id FROM ${this.getMigrationTableName()} ORDER BY id ASC`,
    );
    const appliedMigrations = results.map(x => x.id);

    // sense check existing migrations
    for (let i = 0; i < this.migrations.length; ++i) {
      if (i < appliedMigrations.length) {
        if (appliedMigrations[i] != i + 1) {
          throw new Error(
            `expected applied migration ${i + 1} to have version ${i +
              1}, got ${appliedMigrations[i]}`,
          );
        }
        debug(`migration ${i + 1} already applied`);
      }
    }

    if (updateToLatest) {
      debug('updateToLatest given in init');
      await this.updateToLatest();
      return DatabaseStatus.UpToDate;
    }

    let upToDate = true;

    // check migrations
    for (let migration of this.migrations) {
      const applied = await this.checkMigration(migration);
      upToDate = upToDate && applied;
    }

    const status = upToDate
      ? DatabaseStatus.UpToDate
      : DatabaseStatus.NeedsUpgrade;
    debug(`init status ${status}`);
    return status;
  }

  /**
   * Apply all outstanding migrations to the database.
   */
  async updateToLatest() {
    debug('begin update to latest');
    await this.ensureMigrationsTable();

    for (let migration of this.migrations) {
      await this.applyMigration(migration);
    }
  }

  /**
   * Clear up resources.
   */
  async dispose() {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
      this.client = undefined;
    }
  }

  /**
   * Get a connection to the database.
   */
  get connection(): Client {
    if (!this.client) {
      throw new Error('object disposed or not initialised');
    }
    return this.client;
  }

  /**
   * Apply the given migration to the database.
   * @param migration The migration to apply.
   */
  private async applyMigration(migration: Migration) {
    debug(`applying migration ${migration.version}`);

    return await this.connection.transaction(async client => {
      // skip if the migration has been applied.
      if (await this.checkMigration(migration, client)) {
        debug(`migration ${migration.version} already applied`);
        return;
      }

      // apply each statement
      for (const statement of migration.statements) {
        debug(`migration script "${ellipsis(statement, 40)}"`);
        await client.query(statement);
      }

      // insert metadata
      await client.query(
        `INSERT INTO ${this.getMigrationTableName()} (id, hash) VALUES ($1, $2)`,
        [migration.version, migration.hash()],
      );
    });
  }

  /**
   * Check if the migration has been applied. An exception will be thrown if a
   * migration with the same version number but different hash has been applied.
   */
  private async checkMigration(
    migration: Migration,
    client?: Client,
  ): Promise<boolean> {
    client = client || this.connection;

    const result = await client.singleOrNothing<{ hash: string }>(
      `SELECT hash FROM ${this.getMigrationTableName()} WHERE id = $1`,
      [migration.version],
    );
    if (result === undefined) {
      return false;
    }
    const hash = migration.hash();
    if (result.hash === hash) {
      return true;
    }
    throw new Error(
      `hash mismatch for migration ${migration.version}: recorded ${
        result.hash
      }, calculated ${hash}`,
    );
  }

  /**
   * Create the table which holds information about migrations, if it doesn't
   * already exist.
   */
  private async ensureMigrationsTable(): Promise<void> {
    debug('ensuring migration table exists');

    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS ${this.getMigrationTableName()} (
        id int NOT NULL PRIMARY KEY,
        at timestamp NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
        hash text NOT NULL
      )`);
  }

  /**
   * Return true if the migrations table has been created.
   */
  private async migrationTablePresent(): Promise<boolean> {
    const result = await this.connection.scalar<number>(
      `select (
        CASE WHEN to_regclass('${this.getMigrationTableName()}') IS NULL 
          THEN 0 
          ELSE 1 
        END) AS present`,
    );

    return result === 1;
  }

  /**
   * Get a new connection from the pool.
   */
  private poolConnect = () => {
    if (!this.pool) {
      throw new Error('object disposed or not initialised');
    }
    return this.pool.connect();
  };

  /**
   * Get the name of the migrations table.
   */
  private getMigrationTableName() {
    return `___${this.migrationNamespace}_migrations`;
  }
}

function ellipsis(str: string, len: number): string {
  let ret = str.split('\n')[0];

  if (ret.length > len) {
    return ret.substr(0, len);
  }
  if (ret.length < str.length) {
    ret += '...';
  }
  return ret;
}
