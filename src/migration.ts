import * as crypto from 'crypto';

export default class Migration {
  constructor(public version: number, public statements: string[]) {}

  /**
   * Get the hash of the migration to check integrity.
   */
  hash(): string {
    return this.statements
      .reduce((hash, statement) => {
        hash.update(statement);
        return hash;
      }, crypto.createHash('sha1'))
      .digest('base64');
  }
}
