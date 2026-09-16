import Schema from "schemastery";

import { toJSONSchema } from "./toJSONSchema";
import {
  Action,
  Constructor,
  Draft,
  InferJSONSchemaVersion,
  UnsupportedError,
  type DeepPartial,
} from "./types";

export class Converter<C extends Converter.Config = Converter.Config> {
  public static readonly name = "SchemasteryJSONSchema.Converter";

  protected config: C;
  protected SchemasteryTypeHook: Map<string, Converter.Hooks.SchemasteryToJSONSchemaHook> =
    new Map();
  protected SchemasteryCtorHook: Map<string | object, Converter.Hooks.SchemasteryToJSONSchemaHook> =
    new Map();

  public constructor(config: DeepPartial<C>) {
    //@ts-expect-error ts2345 Schemastery allow partial input
    this.config = new Converter.Config(config);
  }

  public addHook<T extends Converter.Hooks.Type>(
    hookType: T,
    type: string | Constructor,
    hook: Converter.Hooks.HookFunction<T>,
  ) {
    switch (hookType) {
      case Converter.Hooks.Type.SchemasteryToJSONSchema:
        if (typeof type === "string") {
          this.SchemasteryTypeHook.set(type, hook);
        } else {
          this.SchemasteryCtorHook.set(type, hook);
          this.SchemasteryCtorHook.set(type.name, hook);
        }
        break;
      case Converter.Hooks.Type.JSONSchemaToSchemastery:
        break;
    }
  }

  public removeHook(hookType: Converter.Hooks.Type, type: string | Constructor) {
    switch (hookType) {
      case Converter.Hooks.Type.SchemasteryToJSONSchema:
        if (typeof type === "string") {
          this.SchemasteryTypeHook.delete(type);
        } else {
          this.SchemasteryCtorHook.delete(type);
          this.SchemasteryCtorHook.delete(type.name);
        }
        break;
      case Converter.Hooks.Type.JSONSchemaToSchemastery:
        break;
    }
  }

  public toJSONSchema = toJSONSchema;

  protected onUnsupportedType(msg: string, path: string) {
    switch (this.config.unsupportedTypes) {
      case "error":
        throw new UnsupportedError(msg, path);
      case "warn":
        console.warn(`${path}: ${msg}`);
        break;
      case "skip":
        break;
    }
  }
}

export namespace Converter {
  export type TransformOption = boolean;
  export const TransformOption: Schema<TransformOption> = Schema.transform(Schema.boolean(), (v) =>
    v ? "transform" : false,
  ) as Schema<TransformOption>;

  export interface Config<T extends Draft = Draft> {
    draft: T;
    addSchemaVersion: boolean;
    unsupportedTypes: Action;
    patternTransformOptions: {
      unicodeFlag: TransformOption;
      unicodeSetsFlag: TransformOption;
      unicodePropertyEscapes: TransformOption;
    };
  }
  export const defaultConfig = {
    draft: "draft-07",
    addSchemaVersion: true,
    unsupportedTypes: "skip",
    patternTransformOptions: {
      unicodeFlag: false,
      unicodeSetsFlag: true,
      unicodePropertyEscapes: true,
    },
  } satisfies Config;
  export const Config: Schema<Config> = Schema.object({
    draft: Draft.default(defaultConfig.draft),
    addSchemaVersion: Schema.boolean().default(defaultConfig.addSchemaVersion),
    unsupportedTypes: Action.default(defaultConfig.unsupportedTypes),
    patternTransformOptions: Schema.object({
      unicodeFlag: TransformOption.default(defaultConfig.patternTransformOptions.unicodeFlag),
      unicodeSetsFlag: TransformOption.default(
        defaultConfig.patternTransformOptions.unicodeSetsFlag,
      ),
      unicodePropertyEscapes: TransformOption.default(
        defaultConfig.patternTransformOptions.unicodePropertyEscapes,
      ),
    }).default(defaultConfig.patternTransformOptions),
  }).default(defaultConfig);

  export namespace Hooks {
    export enum Type {
      SchemasteryToJSONSchema,
      JSONSchemaToSchemastery,
    }
    export type HookFunction<T extends Type> = T extends Type.SchemasteryToJSONSchema
      ? SchemasteryToJSONSchemaHook
      : never;
    export type SchemasteryToJSONSchemaHook<C extends Config = Config> = (
      this: Converter<C>,
      schema: Schema,
      currentPath: string,
    ) => InferJSONSchemaVersion<unknown, C>;
  }
}
