import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    onlyBundle: ["json-schema-typed"],
  },
  entry: ["./src/index.ts"],
  exports: true,
  format: ["esm", "cjs"],
  minify: true,
  target: "es2020",
});
