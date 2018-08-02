import * as _ from 'lodash';

/**
 * ColumnMap defines a mapping between an model type and a database table.
 */
export default class ColumnMap<ModelKey extends PropertyKey> {
  private map: MapItem<ModelKey>[];

  constructor(
    public readonly definition: Record<ModelKey, string>,
    indices?: Record<ModelKey, number>,
  ) {
    this.map = [];

    for (let k in definition) {
      this.map.push({
        index: indices ? indices[k] : this.map.length + 1,
        field: k,
        column: definition[k],
      });
    }
  }

  /**
   * Get the model field name for the given column (reverse lookup).
   */
  columnToField(column: string): ModelKey | undefined {
    const fields = this.map.filter(x => x.column == column);
    if (fields.length !== 1) {
      return;
    }
    return fields[0].field;
  }

  /**
   * Get a comma-seperated list or array of fields.
   */
  fields(asArray: true): ModelKey[];
  fields(asArray?: false): string;
  fields(asArray?: boolean) {
    const list = this.map.map(x => x.field);
    if (asArray) {
      return list;
    }
    return list.join(',');
  }

  /**
   * Get a comma-seperated list or array of columns.
   */
  columns(asArray: true): string[];
  columns(asArray?: false): string;
  columns(asArray?: boolean) {
    const list = this.map.map(x => x.column);
    if (asArray) {
      return list;
    }
    return list.join(',');
  }

  /**
   * Get a comma-seperated list or array of strings like:
   *
   *     column as "field"
   */
  aliasedColumns(asArray: true): string[];
  aliasedColumns(asArray?: false): string;
  aliasedColumns(asArray?: boolean) {
    const list = this.map.map(x => `${x.column} as "${x.field}"`);
    if (asArray) {
      return list;
    }
    return list.join(',');
  }

  /**
   * Get a comma-seperated list or array of strings like:
   *
   *     column = $i
   */
  assignments(asArray: true): string[];
  assignments(asArray?: false): string;
  assignments(asArray?: boolean) {
    const list = this.map.map(x => `${x.column} = $${x.index}`);
    if (asArray) {
      return list;
    }
    return list.join(',');
  }

  /**
   * Get a comma-seperated list or array of placeholders (e.g. $1, $2) for each
   * column in this map.
   */
  placeholders(asArray: true): string[];
  placeholders(asArray?: false): string;
  placeholders(asArray?: boolean) {
    const list = this.map.map(x => '$' + x.index);
    if (asArray) {
      return list;
    }
    return list.join(',');
  }

  /**
   * Get a list of values from the model in the correct order.
   */
  values(model: Partial<Record<ModelKey, any>>): any[] {
    return this.map.map(x => model[x.field]);
  }

  /**
   * Get a map of fields to placeholder indices.
   */
  indices(): Record<ModelKey, number> {
    return this.map.reduce(
      (ixmap, x) => {
        ixmap[x.field] = x.index;
        return ixmap;
      },
      {} as Partial<Record<ModelKey, number>>,
    ) as Record<ModelKey, number>;
  }

  /**
   * Get a map for only the listed model fields.
   */
  pick<SubModelKey extends ModelKey>(...props: SubModelKey[]) {
    return new ColumnMap<SubModelKey>(
      _.pick<Record<ModelKey, string>, SubModelKey>(this.definition, ...props),
    );
  }

  /**
   * Get a map for only the listed model fields, preserving placeholder indices.
   */
  pickPreserveIndices<SubModelKey extends ModelKey>(...props: SubModelKey[]) {
    return new ColumnMap<SubModelKey>(
      _.pick<Record<ModelKey, string>, SubModelKey>(this.definition, ...props),
      this.indices(),
    );
  }

  /**
   * Get a map which omits listed model fields.
   */
  omit<SubModelKey extends ModelKey>(...props: SubModelKey[]) {
    return new ColumnMap<SubModelKey>(
      _.omit<Record<ModelKey, string>, SubModelKey>(this.definition, ...props),
    );
  }

  /**
   * Get a map which omits listed model fields, preserving placeholder indices.
   */
  omitPreserveIndices<SubModelKey extends ModelKey>(...props: SubModelKey[]) {
    return new ColumnMap<SubModelKey>(
      _.omit<Record<ModelKey, string>, SubModelKey>(this.definition, ...props),
      this.indices(),
    );
  }

  /**
   * Prepend all column names with the given table.
   */
  withTableName(table: string) {
    return new ColumnMap<ModelKey>(
      _.mapValues<Record<ModelKey, string>, string>(
        this.definition,
        v => table + '.' + v,
      ),
    );
  }
}

/**
 * Use to infer fields of the column map given as the type argument.
 */
export type FieldsOf<T> = T extends ColumnMap<infer K> ? K : never;

/**
 * Defines a mapping.
 */
interface MapItem<T extends PropertyKey> {
  index: number;
  field: T;
  column: string;
}
