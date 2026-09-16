import { mapValues, pick } from "cosmokit";
import { TypeName } from "json-schema-typed";
import type { JSONSchema as JSONSchemaDraft07 } from "json-schema-typed/draft-07";
import type { JSONSchema as JSONSchema202012 } from "json-schema-typed/draft-2020-12";
import Schema from "schemastery";

import type { Converter } from "./converter";
import { type Draft, InferJSONSchemaVersion, UnsupportedError } from "./types";
import { isSchemaEqual, convertRegExp, toJSONCompatible } from "./utils";

const schemaArrayBuffer = Schema.arrayBuffer().toJSON();
const schemaDate = Schema.date().toJSON();
const schemaRegExp = Schema.regExp().toJSON();

const assertJSONSchemaVersion = <T, D extends Draft>(
  _s: JSONSchemaDraft07<T> | JSONSchema202012<T>,
  _draft: D,
): _s is D extends "draft-07" ? JSONSchemaDraft07<T> : JSONSchema202012<T> => true;

export function toJSONSchema<T, C extends Converter.Config>(
  this: Converter<C>,
  schema: Schema<T>,
  path?: string,
): InferJSONSchemaVersion<T, C> {
  const type: JSONSchemaDraft07 | JSONSchema202012 = {};
  if (path === undefined) {
    path = "$";
    if (this.config.addSchemaVersion)
      type.$schema =
        this.config.draft === "draft-07"
          ? "http://json-schema.org/draft-07/schema#"
          : "https://json-schema.org/draft/2020-12/schema";
  }

  if (this.SchemasteryTypeHook.has(schema.type)) {
    const result = this.SchemasteryTypeHook.get(schema.type)!.call(this, schema, path);
    if (typeof result === "boolean") return result;
    else Object.assign(type, result);
  } else {
    switch (schema.type) {
      case "any":
        return true;
      case "array":
        type.type = TypeName.Array;
        type.items = this.toJSONSchema(schema.inner!, `${path}[]`);
        if (schema.meta.min !== undefined) type.minItems = schema.meta.min;
        if (schema.meta.max !== undefined) type.maxItems = schema.meta.max;
        break;
      case "boolean":
        type.type = TypeName.Boolean;
        break;
      case "const":
        if (schema.value === null || schema.value === undefined) {
          type.type = TypeName.Null;
        } else {
          try {
            type.const = toJSONCompatible(schema.value);
          } catch (err) {
            if (err instanceof UnsupportedError)
              this.onUnsupportedType(err.message, `${path}.${err.path}`);
            return true;
          }
        }
        break;
      case "dict":
        type.type = TypeName.Object;
        type.propertyNames = this.toJSONSchema(schema.sKey ?? Schema.any(), `${path}[$key]`);
        type.additionalProperties = this.toJSONSchema(schema.inner!, `${path}[$key]`);
        break;
      case "function":
        this.onUnsupportedType('Currently type "function" is not supported', path);
        return true;
      case "intersect":
        type.allOf = schema.list!.map((s) => this.toJSONSchema(s, path));
        break;
      case "is":
        if (this.SchemasteryCtorHook.has(schema.constructor!)) {
          const result = this.SchemasteryCtorHook.get(schema.constructor!)!.call(
            this,
            schema,
            path,
          );
          if (typeof result === "boolean") return result;
          else Object.assign(type, result);
          break;
        }
        switch (schema.constructor as string | object | null | undefined) {
          case "Array":
          case Array:
            Object.assign(type, this.toJSONSchema(Schema.array(Schema.any()), `${path}[]`));
            break;
          case "ArrayBuffer":
          case "SharedArrayBuffer":
          case ArrayBuffer:
          case SharedArrayBuffer:
            type.type = TypeName.String;
            type.contentEncoding = "base64";
            break;
          case "Date":
          case Date:
            type.type = TypeName.String;
            type.format = "date-time";
            break;
          case "Object":
          case Object:
            Object.assign(type, this.toJSONSchema(Schema.object({}), path));
            break;
          case "RegExp":
          case RegExp:
            type.type = TypeName.String;
            type.format = "regex";
            break;
          case null:
          case undefined:
            type.type = TypeName.Null;
            break;
          default:
            this.onUnsupportedType(
              `Unsupported constructor "${typeof schema.constructor === "string" ? schema.constructor : schema.constructor!.name}"`,
              path,
            );
            break;
        }
        break;
      case "never":
        return false;
      case "number":
        type.type = schema.meta.step === 1 ? TypeName.Integer : TypeName.Number;
        if (schema.meta.min !== undefined) type.minimum = schema.meta.min;
        if (schema.meta.max !== undefined) type.maximum = schema.meta.max;
        if (schema.meta.step !== undefined && schema.meta.step !== 1)
          type.multipleOf = schema.meta.step;
        break;
      case "object":
        type.type = TypeName.Object;
        type.properties = mapValues(schema.dict!, (v, k) => this.toJSONSchema(v, `${path}.${k}`));
        type.required = Object.entries(schema.dict!)
          .filter(([, v]) => v.meta.required)
          .map(([k]) => k);
        if (type.required.length === 0) Reflect.deleteProperty(type, "required");
        break;
      case "string":
        type.type = TypeName.String;
        if (schema.meta.pattern) {
          const { source, flags } = schema.meta.pattern;
          type.pattern = convertRegExp(
            new RegExp(source, flags),
            this.config.patternTransformOptions,
          );
        }
        if (schema.meta.min !== undefined) type.minLength = schema.meta.min;
        if (schema.meta.max !== undefined) type.maxLength = schema.meta.max;
        break;
      case "tuple":
        type.type = TypeName.Array;
        if (this.config.draft === "draft-07")
          type.items = schema.list!.map((s) => this.toJSONSchema(s, `${path}[]`));
        else if (assertJSONSchemaVersion(type, "2020-12"))
          type.prefixItems = schema.list!.map((s) =>
            this.toJSONSchema(s, `${path}[]`),
          ) as JSONSchema202012;
        if (schema.meta.min !== undefined) type.minItems = schema.meta.min;
        if (schema.meta.max !== undefined) type.maxItems = schema.meta.max;
        break;
      case "union":
        if (schema.list!.reduce((acc, s) => acc && s.type === "const", true)) {
          type.enum = schema.list!.map((v) => toJSONCompatible(v));
        } else {
          const schemaJSON = schema.toJSON();
          if (isSchemaEqual(schemaArrayBuffer, schemaJSON))
            Object.assign(type, this.toJSONSchema(Schema.is(ArrayBuffer), path));
          else if (isSchemaEqual(schemaDate, schemaJSON))
            Object.assign(type, this.toJSONSchema(Schema.is(Date), path));
          else if (isSchemaEqual(schemaRegExp, schemaJSON))
            Object.assign(type, this.toJSONSchema(Schema.is(RegExp), path));
          else type.anyOf = schema.list!.map((s) => this.toJSONSchema(s, path));
        }
        break;
      case "bitset":
      case "lazy":
      case "transfrom":
        this.onUnsupportedType(`Currently dynamic type "${schema.type}" is not supported `, path);
        return true;
      default:
        this.onUnsupportedType(`Unknown Schemastery type "${schema.type}"`, path);
        return true;
    }
  }
  Object.assign(type, pick(schema.meta, ["description", "default"]));
  if (schema.meta.comment) type.$comment = schema.meta.comment;
  if (assertJSONSchemaVersion(type, "2020-12"))
    schema.meta.badges?.forEach((badge) => (type.deprecated ||= badge.text === "deprecated"));
  return type as InferJSONSchemaVersion<T, C>;
}
