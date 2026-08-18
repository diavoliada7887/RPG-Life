# RPG Live source

`main.ts` is the new typed entry point.

During migration, `scripts/assemble-legacy.mjs` concatenates the historical patch chain into one module so the browser receives one application bundle instead of dozens of dependent scripts. New mechanics should be implemented as TypeScript modules under `src/` and imported by `main.ts`; legacy patch files are frozen and will be retired feature-by-feature.
