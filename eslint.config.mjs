import globals from "globals";

export default [{
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        ecmaVersion: 8,
        sourceType: "module",
    },

    settings: {
        "import/core-modules": ["node_helper"],
    },

    rules: {
        "comma-dangle": 0,
        indent: [2, 4],
        "max-len": "off",
        radix: [2, "as-needed"],
        "no-console": 0,
        "linebreak-style": "off",
        "prettier/prettier": 0,
        quotes: ["error", "single"],
        "jsdoc/require-jsdoc": 0,
    },

    ignores: [
        "eslint.config.mjs"
    ],
}];
