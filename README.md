# schemasteryJSONSchema

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
import { toJSONSchema } from "schemastery-json-schema";

const schema = Schema.object({
  foo: Schema.Dict(Schema.is(Date), Schema.string().pattern(/^[a-f0-9]*/i)),
  bar: Schema.union([Schema.number().step(0.1), Schema.string().min(2)]).default(114514),
  baz: Schema.arrayBuffer(),
});

toJSONSchema(schema);
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
    }
  },
  "required": [],
  "default": {}
}
```

## Parameters

### `toJSONSchema(schema, config?)`

| Parameter                 | Type                          | Default      | Description                                                                                                    |
| ------------------------- | ----------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `draft`                   | `Draft`                       | `"draft-07"` | JSON Schema draft to generate. Currently support `draft-07` and `2020-12`                                      |
| `addSchema`               | `boolean`                     | `true`       | Whether to add the `$schema` declaration to the root schema.                                                   |
| `unsupportedTypes`        | `"skip" \| "warn" \| "error"` | `"skip"`     | How to handle Schemastery types that cannot be represented in JSON Schema                                      |
| `patternTransformOptions` | `object`                      | See below    | Options to transform regexp to patterns. Will pass to [regexpu](https://github.com/mathiasbynens/regexpu-core) |

## License

[MIT](./LICENSE)
