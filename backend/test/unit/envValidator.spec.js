import { validateEnv } from '../../src/config/envValidator.js';

describe('Boot Validation · Zod Env Validator', () => {
  it('passes in development with minimal valid configuration', () => {
    const env = {
      NODE_ENV: 'development',
      PORT: '5001',
      MONGO_URI: 'mongodb://localhost:27017/findmedi_dev',
    };
    const res = validateEnv(env);
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('passes in production with full, secure configuration', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '5001',
      MONGO_URI: 'mongodb+srv://produser:StrongProdPass99@cluster0.findmedi.net/findmedi_prod',
      JWT_SECRET: 'a_very_strong_production_jwt_secret_with_more_than_32_characters_12345!',
      CLIENT_URL: 'https://findmedi.in',
      FRONTEND_URL: 'https://findmedi.in',
    };
    const res = validateEnv(env);
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('fails in production if JWT_SECRET is too short (< 32 chars)', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '5001',
      MONGO_URI: 'mongodb+srv://produser:StrongProdPass99@cluster0.findmedi.net/findmedi_prod',
      JWT_SECRET: 'short_secret_123',
      CLIENT_URL: 'https://findmedi.in',
      FRONTEND_URL: 'https://findmedi.in',
    };
    const res = validateEnv(env);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('JWT_SECRET is too short'))).toBe(true);
  });

  it('fails in production if JWT_SECRET uses a weak default dictionary word', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '5001',
      MONGO_URI: 'mongodb+srv://produser:StrongProdPass99@cluster0.findmedi.net/findmedi_prod',
      JWT_SECRET: 'your_jwt_secret_here_change_me_now_please_12345',
      CLIENT_URL: 'https://findmedi.in',
      FRONTEND_URL: 'https://findmedi.in',
    };
    // Also test exact dictionary match
    const env2 = {
      ...env,
      JWT_SECRET: 'secret',
    };
    const res2 = validateEnv(env2);
    expect(res2.ok).toBe(false);
    expect(res2.errors.some((e) => e.includes('JWT_SECRET'))).toBe(true);
  });

  it('fails in production if MONGO_URI has placeholders', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '5001',
      MONGO_URI: 'mongodb+srv://<username>:<password>@cluster0.net/prod',
      JWT_SECRET: 'a_very_strong_production_jwt_secret_with_more_than_32_characters_12345!',
      CLIENT_URL: 'https://findmedi.in',
      FRONTEND_URL: 'https://findmedi.in',
    };
    const res = validateEnv(env);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('MONGO_URI contains placeholder'))).toBe(true);
  });

  it('fails in production if FRONTEND_URL points to localhost', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '5001',
      MONGO_URI: 'mongodb+srv://produser:StrongProdPass99@cluster0.findmedi.net/findmedi_prod',
      JWT_SECRET: 'a_very_strong_production_jwt_secret_with_more_than_32_characters_12345!',
      CLIENT_URL: 'https://findmedi.in',
      FRONTEND_URL: 'http://localhost:3000',
    };
    const res = validateEnv(env);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('localhost'))).toBe(true);
  });

  it('warns in development if JWT_SECRET is weak, but does not abort boot', () => {
    const env = {
      NODE_ENV: 'development',
      PORT: '5001',
      MONGO_URI: 'mongodb://localhost:27017/dev',
      JWT_SECRET: 'short',
    };
    const res = validateEnv(env);
    expect(res.ok).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
