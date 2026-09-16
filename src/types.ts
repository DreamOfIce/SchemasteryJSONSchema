import type { JSONSchema as JSONSchemaDraft07 } from "json-schema-typed/draft-07";
import type { JSONSchema as JSONSchema202012 } from "json-schema-typed/draft-2020-12";
import Schema from "schemastery";

import type { Converter } from "./converter";

export type Action = "skip" | "warn" | "error";
export const Action: Schema<Action> = Schema.union(["skip", "warn", "error"]);

export type Constructor<T = unknown> = new (...args: unknown[]) => T;

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type DeepRequired<T> = T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> } : T;

export type Draft = "draft-07" | "2020-12";
export const Draft = Schema.union(["draft-07", "2020-12"]);

export type InferJSONSchemaVersion<T, C extends DeepPartial<Converter.Config>> =
  | (C extends DeepPartial<Converter.Config<infer D>>
      ? D extends "draft-07"
        ? JSONSchemaDraft07<T>
        : JSONSchema202012<T>
      : JSONSchemaDraft07<T>)
  | boolean;

export type Replace<T, U, V, R = true> = R extends true
  ? T extends object
    ? { [K in keyof T]: Replace<T[K], U, V, never> }
    : T
  : T extends U
    ? V
    : T extends object
      ? { [K in keyof T]: Replace<T[K], U, V, never> }
      : T;

export class UnsupportedError extends Error {
  public override readonly name;
  public path: string;
  public constructor(msg: string, path: string) {
    super(msg);
    this.name = "SchemasteryJSONSchema.UnsupportedError";
    this.path = path;
  }
}
