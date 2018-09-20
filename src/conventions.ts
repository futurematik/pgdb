import { PropertyMap } from './propertyMap';

export function fromSnakeCase(id: string) {
  return id.split('_').map(x => x.toLowerCase());
}

export function fromCamelCase(id: string) {
  return id.split(/(?=[A-Z])/).map(x => x.toLowerCase());
}

export function toSnakeCase(words: string[], screaming?: boolean) {
  if (screaming) {
    words = words.map(x => x.toUpperCase());
  }
  return words.join('_');
}

export function toCamelCase(words: string[], initial?: boolean) {
  return words
    .map((x, i) => (initial || i > 0 ? x[0].toUpperCase() + x.substr(1) : x))
    .join('');
}

export function camelToSnake(id: string) {
  return toSnakeCase(fromCamelCase(id));
}

export function snakeCaseMap<T>(model: T): PropertyMap<T>;
export function snakeCaseMap<T>(columns: (keyof T)[]): PropertyMap<T>;
export function snakeCaseMap<T>(def: T | (keyof T)[]): PropertyMap<T> {
  if (!Array.isArray(def)) {
    def = Object.keys(def) as (keyof T)[];
  }
  return def.reduce(
    (a, x: keyof T) => ({
      ...a,
      [x]: camelToSnake(x.toString()),
    }),
    {} as any,
  );
}
