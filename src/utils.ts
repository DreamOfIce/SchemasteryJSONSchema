import { mapValues } from "cosmokit";
import rewritePattern from "regexpu-core";
import Schema from "schemastery";

import { Replace, UnsupportedError } from "./types";

export interface ConvertRegExpOptions {
  unicode?: boolean;
  unicodePropertyEscapes?: boolean;
  unicodeSets?: boolean;
}

/**
 * convert a RegExp to a version without flags.
 */
export const convertRegExp = (
  regexp: RegExp,
  { unicode = false, unicodePropertyEscapes = true, unicodeSets = true }: ConvertRegExpOptions = {},
): string => {
  let pattern = regexp.source,
    modifiers = "";
  const flags = regexp.flags;
  if (flags.includes("i")) modifiers += "i";
  if (flags.includes("m")) modifiers += "m";
  if (modifiers.length > 0) pattern = `(?${modifiers}:${pattern})`;
  const result = rewritePattern(pattern, flags, {
    unicodeFlag: unicode ? "transform" : false,
    unicodePropertyEscapes: unicodePropertyEscapes ? "transform" : false,
    unicodeSetsFlag: unicodeSets ? "transform" : false,
    dotAllFlag: "transform",
    namedGroups: "transform",
    modifiers: "transform",
  });
  return modifiers.length > 0 ? result.slice(3, -1) : result;
};

/**
 * compare whether two or more arrays have same elements(in any order)
 */
export const hasSameElements = (arr1: unknown[], ...arrs: unknown[][]) =>
  arrs.reduce((acc, { length }) => (acc &&= length === arr1.length), true) &&
  new Set(arr1.concat(...arrs)).size === arr1.length;

/**
 * compare schema of schemastery via `schema.toJSON()`
 */
export const isSchemaEqual = <T extends Schema>(schema1: Schema, schema2: T): schema1 is T => {
  if (schema1 === schema2) return true;
  const s1 = schema1.toJSON();
  const s2 = schema2.toJSON();
  const refs = { ...s1.refs, ...s2.refs } as unknown as Record<
    number,
    Replace<Schema, Schema, bigint>
  >;

  const checkEqual = (
    a: Replace<Schema, Schema, number>,
    b: Replace<Schema, Schema, number>,
  ): boolean => {
    if (!hasSameElements(Object.keys(a), Object.keys(b))) return false;
    let result = true;
    Object.entries(a).forEach(([key, valueA]) => {
      const valueB = (<Record<string, number>>b)[key]!;
      if (key === "sKey" || key === "inner") result &&= checkEqual(refs[valueA]!, refs[valueB]!);
      else if (Array.isArray(valueA)) result &&= Array.isArray(valueB);
      else if (typeof valueA === "object")
        result &&= typeof valueB === "object" && checkEqual(valueA, valueB);
      else result &&= valueA === valueB;
    });
    return result;
  };
  return checkEqual(refs[schema1.uid]!, refs[schema2.uid]!);
};

export const toJSONCompatible = (src: unknown, path = ""): unknown => {
  const type = typeof src;
  if (src === null || src === undefined) return null;
  else if (type === "symbol" || type === "function")
    throw new UnsupportedError(`Type "${type}" cannot be converted to a JSON type`, path);
  else if (Array.isArray(src))
    return src.map((v, i) => toJSONCompatible(v, `${path}[${i.toString()}]`));
  else if (type === "object")
    return mapValues(src, (v, k) => toJSONCompatible(v, `${path}.${k as string}`));
  else return src;
};
