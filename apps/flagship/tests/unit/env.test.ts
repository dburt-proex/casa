import { describe, expect, it } from 'vitest';
import { shouldLoadEnvExample } from '../../src/server/env.js';

describe('shouldLoadEnvExample', () => {
  it('loads .env.example defaults in development', () => {
    expect(shouldLoadEnvExample('development')).toBe(true);
  });

  it('loads .env.example defaults in test', () => {
    expect(shouldLoadEnvExample('test')).toBe(true);
  });

  it('does not load .env.example defaults in production', () => {
    expect(shouldLoadEnvExample('production')).toBe(false);
  });

  it('does not load .env.example defaults when NODE_ENV is unset', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    expect(shouldLoadEnvExample()).toBe(false);

    process.env.NODE_ENV = previousNodeEnv;
  });
});
