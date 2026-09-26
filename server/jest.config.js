/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/**
 * jest.config.js (CommonJS)
 *
 * Using a .js config instead of .json so we can load .env into process.env
 * before the Jest worker configuration is built. ts-jest resolves imports
 * against TypeScript source, but env.ts validates process.env at module-load
 * time — so the env must be populated before any worker imports app.ts.
 *
 * Jest forks worker processes from the main Jest process, inheriting its
 * process.env, so calling loadEnv() here ensures all workers see the vars.
 */

const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding double-quotes if present
    const val = raw.replace(/^"(.*)"$/, '$1');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnv();

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    // ts-jest resolves TypeScript source files (not compiled .js output).
    // Strip the .js extension that the source code uses for compiled imports.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/generated/**',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
};

module.exports = config;
