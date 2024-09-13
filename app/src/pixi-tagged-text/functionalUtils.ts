import { Nested } from "./types.js";

/**
 * a -> boolean
 */
type Predicate<T> = (t: T) => boolean;

export const combineRecords = <
  A extends Record<string, unknown>,
  B extends Record<string, unknown> = A,
>(
  a: A,
  b: B,
): A & B => ({
  ...a,
  ...b,
});

/**
 * Returns the first item in a list. AKA head
 * List a -> a
 */
export const first = <T>(a: T[]): T => a[0];

/**
 * Return the last item in a list. Aka tail
 * List f => f a -> a
 */
export const last = <T>(a: T[]): T => a[a.length - 1];

export const isDefined: Predicate<unknown | undefined> = (a): boolean =>
  a !== undefined;

/**
 * Predicate p => p -> p
 */
export const complement =
  <T>(predicate: Predicate<T>) =>
  (input: T): boolean =>
    !predicate(input);

/**
 * List f => string -> f {string: a} -> f a
 */
export const pluck =
  <T, U>(key: keyof U) =>
  (objects: U[]): T[] =>
    (objects as (U & Record<string, T>)[]).map<T>(o => o[key]);

export const assoc =
  <T extends Record<string, U>, U>(key: keyof T) =>
  (value: U) =>
  (object: T): T => ({
    ...object,
    ...{ [key]: value },
  });

/**
 * Takes a key (k), a function (f) and an object (o) and applies f to the property k
 * of the object and stores the result in o[k].
 * Key k, Record r => k -> (a -> a) -> r k a -> r k a
 */
export const mapProp =
  <T, U>(k: keyof U) =>
  (f: (t: T) => T) =>
  (o: U): U => ({
    ...o,
    [k]: f((o as U & Record<string, T>)[k]),
  });

export const flatReduce =
  <T, U>(f: (acc: U, t: T) => U, acc: U) =>
  (nested: Nested<T>): U =>
    // @ts-ignore-next-line
    [nested].flat(255).reduce(f, acc);

type FlatReduceRetrun<T, U> = (nested: Nested<T>) => U;

export const flatEvery = <T>(p: Predicate<T>): FlatReduceRetrun<T, boolean> =>
  flatReduce<T, boolean>((acc: boolean, t: T) => acc && p(t), true);

export const nestedMap =
  <T, U>(f: (t: T) => U) =>
  (nested: Nested<T>): Nested<U> =>
    nested instanceof Array ? nested.map(nestedMap(f)) : f(nested);

/**
 * Takes a list and a predicate and returns a number that represents the number of
 * true statements when applied to the elements in the list.
 * In other words, the number of elements that pass the test.
 * (a -> boolean) -> a[] -> number
 */
export const countIf =
  <T>(p: Predicate<T>) =>
  (a: Array<T>): number =>
    a.reduce((count, item) => (p(item) ? count + 1 : count), 0);

export type Unary<Param, Return> = (p: Param) => Return;
