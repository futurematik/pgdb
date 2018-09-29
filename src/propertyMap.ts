import * as _ from 'lodash';

export type PropertyMapKey = keyof any;

/**
 * Shorthand to define a property map without specifying indices.
 */
export type PropertyMapDefinition<T> = { [Prop in keyof T]-?: string };

/**
 * A full property map definition.
 */
export type PropertyMap<T> = { [Prop in keyof T]-?: PropertyMapItem<Prop> };

/**
 * An item in a property map.
 */
export interface PropertyMapItem<TPropertyKey = PropertyMapKey> {
  column: string;
  property: TPropertyKey;
  index: number;
}

/**
 * Get the type of the property keys of the map.
 */
export type PropsOf<T> = T extends PropertyMap<T> ? keyof T : never;

/**
 * Get the property keys of the map.
 */
export function propsOf<T>(map: PropertyMap<T>): PropsOf<T>[] {
  return Object.keys(map) as any;
}

/**
 * Create a property map from the given definition.
 */
export function propertyMap<T>(
  def: PropertyMapDefinition<T> | PropertyMapItem<keyof T>[],
): PropertyMap<T> {
  if (!Array.isArray(def)) {
    def = (_.entries(def) as [keyof T, string][]).map(
      ([property, column], index) => ({
        property,
        column,
        index,
      }),
    );
  }
  return def.reduce((a, x) => ({ [x.property]: x, ...a }), {} as any);
}

/**
 * Get the definition items for a property map.
 */
export function propertyMapItems<T>(
  map: PropertyMap<T>,
): PropertyMapItem<keyof T>[] {
  return _.values(map);
}

/**
 * Add a table name to the column names of the map.
 */
export function withTableName<T>(
  map: PropertyMap<T>,
  tableName: string,
): PropertyMap<T> {
  return propertyMap(
    propertyMapItems(map).map(x => ({
      property: x.property,
      index: x.index,
      column: `"${tableName}"."${x.column}"`,
    })),
  );
}

/**
 * Create a property map by omitting properties from another property map.
 */
export function omitProperties<T, TOmitProperties extends keyof T>(
  map: PropertyMap<T>,
  omitProperties: TOmitProperties[],
  preserveIndices?: boolean,
): PropertyMap<Pick<T, Exclude<keyof T, TOmitProperties>>> {
  const newMap = omitPropertiesPreserveIndices(map, omitProperties);
  if (preserveIndices) {
    return newMap;
  }
  return propertyMap<Pick<T, Exclude<keyof T, TOmitProperties>>>(
    propertyMapItems(newMap).map((x, index) => ({
      column: x.column,
      property: x.property,
      index,
    })),
  );
}

/**
 * Create a property map by omitting properties from another property map.
 */
export function omitPropertiesPreserveIndices<
  T,
  TOmitProperties extends keyof T
>(
  map: PropertyMap<T>,
  omitProperties: TOmitProperties[],
): PropertyMap<Pick<T, Exclude<keyof T, TOmitProperties>>> {
  return _.omit(map, ...omitProperties);
}

/**
 * Create a property map by omitting properties from another property map.
 */
export function pickProperties<T, TPickProperties extends keyof T>(
  map: PropertyMap<T>,
  pickProperties: TPickProperties[],
  preserveIndices?: boolean,
): PropertyMap<Pick<T, TPickProperties>> {
  const newMap = pickPropertiesPreserveIndices(map, pickProperties);
  if (preserveIndices) {
    return newMap;
  }
  return propertyMap<Pick<T, TPickProperties>>(
    propertyMapItems(newMap).map((x, index) => ({
      column: x.column,
      property: x.property,
      index,
    })),
  );
}

/**
 * Create a property map by omitting properties from another property map.
 */
export function pickPropertiesPreserveIndices<
  T,
  TPickProperties extends keyof T
>(
  map: PropertyMap<T>,
  pickProperties: TPickProperties[],
): PropertyMap<Pick<T, TPickProperties>> {
  return _.pick(map, ...pickProperties);
}

/**
 * Return a comma-separated list of columns.
 */
export function columnList<T>(map: PropertyMap<T>): string {
  return propertyMapItems(map)
    .map(x => x.column)
    .join(',');
}

/**
 * Return a comma-separated list of columns with aliases.
 */
export function aliasedColumns<T>(map: PropertyMap<T>): string {
  return propertyMapItems(map)
    .map(x => `${x.column} as "${x.property}"`)
    .join(',');
}

/**
 * Return a comma-separated list of column to placeholder assignments.
 */
export function assignments<T>(map: PropertyMap<T>): string {
  return propertyMapItems(map)
    .map(x => `${x.column} = $${x.index}`)
    .join(',');
}

/**
 * Get a list of placeholders for the given map.
 */
export function placeholders<T>(map: PropertyMap<T>): string {
  return propertyMapItems(map)
    .map(x => `$${x.index}`)
    .join(',');
}

/**
 * Get a list of the values from the model in the same order as the column list.
 */
export function mapValues<T>(map: PropertyMap<T>, model: T): any[] {
  return propertyMapItems(map).reduce(
    (a, { property, index }) => {
      a[index] = model[property];
      return a;
    },
    [] as any[],
  );
}
