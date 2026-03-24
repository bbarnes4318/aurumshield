import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Vitest config for REAL DB-BACKED integration tests.
 *
 * Runs only *.integration.test.ts files against an ephemeral
 * PostgreSQL container (docker-compose.test.yml).
 *
 * These tests are NOT run as part of the standard `vitest` suite.
 * Use: npx vitest run --config vitest.config.integration.ts
 */
const config = {
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL:
        "postgresql://test_user:test_pass@localhost:5433/aurumshield_test",
      NODE_ENV: "test",
    },
    deps: {
      inline: ["server-only"],
    },
  },
};

export default config;
