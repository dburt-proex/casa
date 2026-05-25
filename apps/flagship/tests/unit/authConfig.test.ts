import { afterEach, describe, expect, it } from 'vitest';
import { isDevLoginEnabled } from '../../src/server/authConfig.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('isDevLoginEnabled', () => {
  it('always disables dev login in production even when the flag is true', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEV_LOGIN = 'true';

    expect(isDevLoginEnabled()).toBe(false);
  });

  it('enables dev login outside production by default', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ENABLE_DEV_LOGIN;

    expect(isDevLoginEnabled()).toBe(true);
  });

  it('allows local developers to disable dev login explicitly', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'false';

    expect(isDevLoginEnabled()).toBe(false);
  });
});
