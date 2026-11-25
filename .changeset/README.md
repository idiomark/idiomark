# Changesets

All `@idiomark/*` packages are versioned together (`fixed` group) — one version bump
moves the whole suite, matching how the format packages evolve in lockstep.

## Workflow

1. Make your change on a branch/PR.
2. Add a changeset for anything that should reach a release:

   ```
   pnpm exec changeset
   ```

   Commit the generated `.md` file with the PR.
3. On merge to `main`, the `Release` workflow consumes the changesets:
   - Changesets present → it opens/updates a **Version Packages** PR
     (bumps versions, updates CHANGELOGs, bumps intra-repo deps).
   - That PR merged + no changesets pending → it publishes all `@idiomark/*`
     packages to npm with provenance.

`NPM_TOKEN` secret must be set repo-wide (fine-grained token with
publish permission for the `idiomark` packages, automation type — no OTP).
