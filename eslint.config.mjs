import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `const { rank, ...item } = row` is the idiomatic way to drop fields.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", ".local-stack/**", "playwright-report/**", "test-results/**"] },
];

export default config;
