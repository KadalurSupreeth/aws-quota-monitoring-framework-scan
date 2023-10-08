"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    clearMocks: false,
    collectCoverage: true,
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: ["/node_modules/"],
    moduleDirectories: ["node_modules"],
    moduleFileExtensions: ["ts", "json", "jsx", "js", "tsx", "node"],
    resetMocks: false,
    testMatch: ["**/?(*.)+(spec|test).[t]s?(x)"],
    testPathIgnorePatterns: ["/node_modules/"],
    transform: {
        "^.+\\.(t)sx?$": "ts-jest",
    },
    verbose: true,
    collectCoverageFrom: [
        "**/*.ts",
        "!**/*.spec.ts",
        "!./jest.config.ts",
        "!./jest.setup.ts",
    ],
    setupFiles: ["./jest.setup.ts"],
    coverageReporters: [["lcov", { projectRoot: "../" }], "text"],
    rootDir: "./",
    moduleNameMapper: {
        "solutions-utils": "<rootDir>/../../utilsLayer",
    },
};
exports.default = config;
