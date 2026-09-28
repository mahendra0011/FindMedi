// Regression guard for the MindSupport sub-app import path.
//
// WHY: MindSupport mounts in-process at /api/mindsupport/* via a LAZY import
// (src/routes/mindsupport.js). A missing dependency in mindsupport/src therefore
// never breaks the main server boot and the merge smoke tests cannot see it —
// they only assert "not 404", and a 500 (failed import) passes that. This is
// exactly how the express-validator removal silently killed every mind route.
//
// These tests assert the module graph itself resolves, so any future
// `npm uninstall` of a package still imported by mindsupport/src fails CI
// immediately instead of surfacing as runtime 500s.
describe('MindSupport sub-app imports', () => {
  it('resolves every mind route module and exposes registerRoutes', async () => {
    const routes = await import('../mindsupport/src/routes/index.js');
    expect(typeof routes.registerRoutes).toBe('function');
  });

  it('resolves the MindSupport express app (the bridge import path)', async () => {
    const mod = await import('../mindsupport/src/app.js');
    expect(mod.app).toBeDefined();
    expect(typeof mod.app.use).toBe('function');
    expect(typeof mod.connectDatabase).toBe('function');
  });
});
