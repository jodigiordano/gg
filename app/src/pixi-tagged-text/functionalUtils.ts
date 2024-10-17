import { Nested } from "./types.js";

/**
 * a -> boolean
 */
type Predicate<T> = (t: T) => boolean;

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

export type Unary<Param, Return> = (p: Param) => Return;
