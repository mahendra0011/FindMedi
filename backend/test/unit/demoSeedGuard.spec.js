import { jest as jestMock } from '@jest/globals';
import { ensureDemoUsers } from '../../src/services/demoSeedService.js';
import logger from '../../src/config/logger.js';

describe('demo seed startup guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoSeedEnabled = process.env.DEMO_SEED_ENABLED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDemoSeedEnabled === undefined) delete process.env.DEMO_SEED_ENABLED;
    else process.env.DEMO_SEED_ENABLED = originalDemoSeedEnabled;
    jestMock.restoreAllMocks();
  });

  it('does not write demo records unless explicitly enabled', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DEMO_SEED_ENABLED;
    const info = jestMock.spyOn(logger, 'info').mockImplementation(() => {});

    await expect(ensureDemoUsers()).resolves.toBeUndefined();
    expect(info).toHaveBeenCalledWith(expect.stringContaining('DEMO_SEED_ENABLED=true'));
  });

  it('never seeds demo records in production, even when explicitly enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_SEED_ENABLED = 'true';
    const warn = jestMock.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(ensureDemoUsers()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled in production'));
  });
});
