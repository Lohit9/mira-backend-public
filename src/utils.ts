import _ from 'lodash'
import { err, ok, Result } from 'neverthrow'

export const percentageChange = (v1: number, v2: number): number => {
  if (v1 === 0) return Infinity;

  return Math.abs(Math.round(((v2 - v1) / v1) * 100));
};

// JS version for easy copy-paste into Node REPL
// const k = (keepaTime) => (keepaTime + 21564000) * 60000
//
export const keepaTimeToUnixTimestamp = (keepaTime: number): number =>
  (keepaTime + 21564000) * 60000

export const camelCase = (val: string): string => _.camelCase(val)

export const isObject = (val: unknown): val is Record<string, unknown> =>
  _.isPlainObject(val)

export const head = <T>(list: T[]): T | undefined => list[0]

/** The lodash type can be wonky */
export const identity = <T>(t: T): T => t

/**
 * Use in andThen pipes to pipe nullable values into functions that expect non-nullable values
 * @example
 * ```ts
 * findContact(email)
 *   .andThen(errIfNull(notFound('Cannot delete non-existent contact!')))
 *   .andThen(deleteContact)
 * ```
 **/
export const errIfNull =
  <E>(error: E) =>
  <T>(t: T | undefined | null): Result<T, E> =>
    !_.isNil(t) ? ok(t) : err(error)

export const isNullish = <T>(
  subject: T | undefined | null
): subject is undefined | null => subject === undefined || subject === null

export const isNonNullish = <T>(subject: T | undefined | null): subject is T =>
  !isNullish(subject)
