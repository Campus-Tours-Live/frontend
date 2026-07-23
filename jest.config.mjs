import nextJest from "next/jest.js";

// next/jest wires up the Next.js compiler (SWC), handles next/font, CSS module
// mocking, and the @/* path alias automatically.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Unit and integration tests live in SEPARATE top-level folders:
  //   tests/unit/**         — isolated units (deps mocked or pure)
  //   tests/integration/**  — real hooks/React Query + mocked network, composed UIs
  // Run a single layer with: `npx jest tests/unit` or `npx jest tests/integration`.
  testMatch: ["<rootDir>/tests/**/*.test.{ts,tsx}"],
  // Coverage (`npm run test:coverage`). Measure only production code under src/
  // (exclude type decls and the root layout bootstrap).
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/app/layout.tsx"],
  // Always collect coverage — so a plain `npm test` prints the terminal report and regenerates
  // the istanbul HTML report too, same as `npm run test:coverage`.
  collectCoverage: true,
  coverageDirectory: "coverage",
  // "html" → coverage/lcov-report/index.html (the istanbul HTML report), regenerated
  // on every run. "text"/"text-summary" print to the terminal; "lcov" feeds CI tools.
  coverageReporters: ["text", "text-summary", "html", "lcov"],
  // Coverage gate: a 90% floor across the board — identical to the BFF and Core repos.
  // Enforced on every run — `collectCoverage` is on, so the threshold applies to a plain
  // `npm test` too, not just `npm run test:coverage`.
  coverageThreshold: {
    global: { statements: 90, functions: 90, lines: 90, branches: 90 },
  },
};

export default createJestConfig(config);
