import 'jest';
import {
  fromSnakeCase,
  fromCamelCase,
  toSnakeCase,
  toCamelCase,
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
