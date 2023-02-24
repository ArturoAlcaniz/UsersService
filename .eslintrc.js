module.exports = {
    env: {
        es6: true,
    },
    extends: ["plugin:@darraghor/nestjs-typed/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json"],
        sourceType: "module",
        ecmaVersion: "es2019",
    },
    plugins: ["@darraghor/nestjs-typed"],
};
