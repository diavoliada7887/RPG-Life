# RPG Live migration — stage 1

The production app stays on the stabilized legacy runtime while the new TypeScript/Vite build is validated.

This stage deliberately preserves gameplay behavior: the historical patch chain is assembled at build time into one browser bundle. New work belongs under `src/`; legacy patch files are frozen and will be retired feature-by-feature.

Cloud sync/recovery code is intentionally excluded from the new runtime. The migration branch is synchronized with the current local-only `main` baseline.
