import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    onlyBundle: ["json-schema-typed"],
  },
  entry: ["./src/index.ts", "./src/toJSONSchema.ts"],
  exports: true,
  format: ["esm"],
  minify: true,
  target: "es2020",
});
