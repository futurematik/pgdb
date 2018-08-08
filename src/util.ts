import { MoreThanOneDbError, NotFoundDbError } from './errors';

export function single<T>(results: T[]): T {
  if (results.length > 1) {
    throw new MoreThanOneDbError();
  } else if (results.length === 0) {
    throw new NotFoundDbError();
  }
  return results[0];
}

export function singleOrNothing<T>(results: T[]): T | undefined {
  if (results.length > 1) {
    throw new MoreThanOneDbError();
  } else if (results.length === 0) {
    return;
  }
  return results[0];
}

export function scalar<T>(results: T[]): T {
  const one = single(results);
  return <T>getFirstValue(one);
}

export function scalarOrNothing<T = any>(results: any[]): T | undefined {
  const one = singleOrNothing(results);
  if (one === undefined) {
    return;
  }
  return <T>getFirstValue(one);
}

function getFirstValue(obj: any) {
  const k = Object.keys(obj);
  if (!k.length) {
    return;
  }
  return obj[k[0]];
}
