import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@/game/(.*)$": "<rootDir>/src/lib/game-engine/$1",
    "^@/db/(.*)$": "<rootDir>/src/lib/database/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        // Allow JS-incompatible TS features in tests
        diagnostics: { ignoreDiagnostics: [6133, 6196] },
      },
    ],
  },
  // Test categorization via projects
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  // Reasonable timeouts
  testTimeout: 10_000,
  // Coverage
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "!src/lib/**/*.d.ts",
    "!src/lib/database/index.ts", // Singleton — not unit-testable
  ],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 25,
      lines: 35,
      statements: 35,
    },
  },
};

export default config;
