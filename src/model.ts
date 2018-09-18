export type TypePlaceholder<T> = () => T;
export type ModelType<T> = { [Prop in keyof T]: TypePlaceholder<T[Prop]> };
export type UnwrapDefinition<T> = T extends ModelType<infer U> ? U : never;

export function keyof<T>(def: ModelType<T>): (keyof T)[] {
  return Object.keys(def) as (keyof T)[];
}

export function type<T>(): TypePlaceholder<T> {
  return () => {
    throw new Error('this function is not supposed to be called at runtime');
  };
}

export function model<T>(def: ModelType<T>): ModelType<T> {
  return def;
}
