/**
 * DbErrorCode represents an error which has occurred in the database.
 */
export enum DbErrorCode {
  Unknown,
  DuplicateKey,
  InvalidReference,
  NotFound,
  MoreThanOne,
  SerializationFailure,
  DeadlockDetected,
}

/**
 * DbError represents an error which has occurred in the database.
 */
export class DbError extends Error {
  constructor(
    public convertedCode: DbErrorCode,
    message: string,
    public readonly constraintName?: string,
    public readonly tableName?: string,
    public readonly columnName?: string,
    public readonly foreignTable?: string,
  ) {
    super(message);
  }
}

/**
 * NotFoundDbError is thrown when results were expect but not found.
 */
export class NotFoundDbError extends DbError {
  constructor() {
    super(DbErrorCode.NotFound, 'no results found');
  }
}

/**
 * MoreThanOneDbError is thrown when a single result was expected but more were
 * found.
 */
export class MoreThanOneDbError extends DbError {
  constructor(count?: number) {
    super(
      DbErrorCode.MoreThanOne,
      count != undefined
        ? `expected 1 result, got ${count}`
        : 'expected 1 result',
    );
  }
}

/**
 * Attempt to convert a postgres error to a general error. This function is
 * incomplete.
 */
export function convertPgError(err: any): any {
  if (!err || err.code === undefined) {
    return err;
  }

  // If using the DDL generation methods in this package,
  // the constraint looks like UQ:table:column or FK:table:column:reference
  // so try to get info from that if it is there.
  let [, t, col, fk] = (err.constraint || '').split(':');
  [t, col] = [err.table || t, err.column || col];

  let code: DbErrorCode;
  let message = 'database error';

  switch (err.code) {
    case '23503':
      code = DbErrorCode.InvalidReference;
      message =
        `invalid reference from ${t || 'table'}.${col || '<unknown>'}` +
        ` to ${fk || '<unknown>'}`;
      break;
    case '23505':
      code = DbErrorCode.DuplicateKey;
      message = `duplicate key in ${t || 'table'}.${col || '<unknown>'}`;
      break;
    case '40001':
      code = DbErrorCode.SerializationFailure;
      message = `serialization failure in transaction`;
      break;
    case '40P01':
      code = DbErrorCode.DeadlockDetected;
      message = `deadlock detected in transaction`;
      break;
    default:
      return err;
  }

  return new DbError(code, message, err.constraint, t, col, fk);
}

/**
 * Attempt to get an error code for the given error.
 */
export function getDbErrorCode(err: any): DbErrorCode {
  if (err.convertedCode) {
    return <DbErrorCode>err.convertedCode;
  }
  return DbErrorCode.Unknown;
}

/**
 * Attempt to cast the current error to a DbError instance.
 */
export function getDbError(err: any): DbError | undefined {
  if (err && err instanceof DbError) {
    return err;
  }
  return undefined;
}
