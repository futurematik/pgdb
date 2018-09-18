import * as _ from 'lodash';

export type PropertyMapKey = keyof any;

/**
 * Shorthand to define a property map without specifying indices.
 */
export type PropertyMapDefinition<T> = { [Field in keyof T]: string };

/**
 * A full property map definition.
 */
export type PropertyMap<T> = { [Field in keyof T]: PropertyMapItem<Field> };

/**
 * An item in a property map.
 */
export interface PropertyMapItem<TPropertyKey = PropertyMapKey> {
  column: string;
  property: TPropertyKey;
  index: number;
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
 * Create a property map by omitting fields from another field map.
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
  pickFields: TPickProperties[],
  preserveIndices?: boolean,
): PropertyMap<Pick<T, TPickProperties>> {
  const newMap = pickPropertiesPreserveIndices(map, pickFields);
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
 * Create a field map by omitting properties from another field map.
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
