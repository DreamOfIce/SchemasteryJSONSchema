# SchemasteryJSONSchema

Convert between [Schemastery](https://github.com/Shigma/Schemastery) and [JSON Schema](https://json-schema.org/)

## TODO

- [x] Schemastery to JSON Schema
- [ ] JSON Schema to Schemastery

## Limits

### Schemastery to JSON Schema

- Type with transformation(`bitmap`, `lazy` and `transform`) are not supported
- constructors other than `ArrayBuffer`, `Date`, `RegExp`, and `SharedArrayBuffer` are not supported

Add your custom hooks if you want to convert these types

## Usage

```ts
import Schema from "schemastery";
import { Converter } from "@dreamofice/schemastery-json-schema";

const converter = new Converter();
converter.addHook(Converter.Hooks.Type.SchemasteryToJSONSchema, Error, function (schema, path) {
  return this.toJSONSchema(
    Schema.object({ name: Schema.string().required(), msg: Schema.string().required() }),
  );
});
const schema = Schema.object({
  foo: Schema.dict(Schema.is(Date), Schema.string().pattern(/^[a-f0-9]*/i)),
  bar: Schema.union([Schema.number().step(0.1), Schema.string().min(2)]).default(114514),
  baz: Schema.arrayBuffer(),
  err: Schema.is(Error),
});

converter.toJSONSchema(schema);
```

Expected output:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "foo": {
      "type": "object",
      "propertyNames": {
        "type": "string",
        "pattern": "^[0-9A-Fa-f]*"
      },
      "additionalProperties": {
        "type": "string",
        "format": "date-time"
      },
      "default": {}
    },
    "bar": {
      "anyOf": [
        {
          "type": "number",
          "multipleOf": 0.1
        },
        {
          "type": "string",
          "minLength": 2
        }
      ],
      "default": 114514
    },
    "baz": {
      "type": "string",
      "contentEncoding": "base64"
    },
    "err": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "msg": {
          "type": "string"
        }
      },
      "required": ["name", "msg"],
      "default": {}
    }
  },
  "default": {}
}
```

## Parameters

| Parameter                                        | Type                          | Default      | Description                                                                                                    |
| ------------------------------------------------ | ----------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `draft`                                          | `Draft`                       | `"draft-07"` | JSON Schema draft to generate. Currently support `draft-07` and `2020-12`                                      |
| `addSchemaVersion`                               | `boolean`                     | `true`       | Whether to add the `$schema` declaration to the output                                                         |
| `unsupportedTypes`                               | `"skip" \| "warn" \| "error"` | `"skip"`     | How to handle Schemastery types that cannot be converted into JSON Schema                                      |
| `patternTransformOptions`                        | `object`                      | See bellow   | Options to transform regexp to patterns. Will pass to [regexpu](https://github.com/mathiasbynens/regexpu-core) |
| `patternTransformOptions.unicodeFlag`            | `boolean`                     | `false`      |                                                                                                                |
| `patternTransformOptions.unicodeSetsFlag`        | `boolean`                     | `true`       |                                                                                                                |
| `patternTransformOptions.unicodePropertyEscapes` | `boolean`                     | `true`       |                                                                                                                |

## License

[MIT](./LICENSE)
