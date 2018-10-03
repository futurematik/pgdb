import 'jest';
import {
  fromSnakeCase,
  fromCamelCase,
  toSnakeCase,
  toCamelCase,
  snakeCaseMap,
} from './conventions';

describe('fromSnakeCase', () => {
  it('converts from snake case', () => {
    const id = 'some_snake_case_thing';
    const result = fromSnakeCase(id);
    expect(result).toEqual(['some', 'snake', 'case', 'thing']);
  });

  it('converts from screaming snake case', () => {
    const id = 'BIG_LOUD_NOISES';
    const result = fromSnakeCase(id);
    expect(result).toEqual(['big', 'loud', 'noises']);
  });
});

describe('fromCamelCase', () => {
  it('converts from camel case', () => {
    const id = 'ohLookACamel';
    const result = fromCamelCase(id);
    expect(result).toEqual(['oh', 'look', 'a', 'camel']);
  });

  it('converts from initial case', () => {
    const id = 'SomeThingHere';
    const result = fromCamelCase(id);
    expect(result).toEqual(['some', 'thing', 'here']);
  });
});

describe('toSnakeCase', () => {
  it('converts to snake case', () => {
    const words = ['some', 'snake', 'case', 'thing'];
    const result = toSnakeCase(words);
    expect(result).toBe('some_snake_case_thing');
  });

  it('converts to screaming snake case', () => {
    const words = ['big', 'loud', 'noises'];
    const result = toSnakeCase(words, true);
    expect(result).toBe('BIG_LOUD_NOISES');
  });
});

describe('toCamelCase', () => {
  it('converts to camel case', () => {
    const words = ['oh', 'look', 'a', 'camel'];
    const result = toCamelCase(words);
    expect(result).toBe('ohLookACamel');
  });

  it('converts to initial case', () => {
    const words = ['some', 'thing', 'here'];
    const result = toCamelCase(words, true);
    expect(result).toBe('SomeThingHere');
  });
});

interface Model {
  columnOne: number;
  columnTwo: number;
  columnThree: number;
}

describe('snakeCaseMap', () => {
  it('creates a map from the properties', () => {
    const keys: (keyof Model)[] = ['columnOne', 'columnTwo', 'columnThree'];
    const result = snakeCaseMap<Model>(keys);

    expect(Object.keys(result)).toHaveLength(3);

    expect(result.columnOne.property).toEqual('columnOne');
    expect(result.columnOne.column).toEqual('column_one');
    expect(result.columnOne.index).toEqual(0);

    expect(result.columnTwo.property).toEqual('columnTwo');
    expect(result.columnTwo.column).toEqual('column_two');
    expect(result.columnTwo.index).toEqual(1);

    expect(result.columnThree.property).toEqual('columnThree');
    expect(result.columnThree.column).toEqual('column_three');
    expect(result.columnThree.index).toEqual(2);
  });
});
