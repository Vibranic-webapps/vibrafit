# Vibrafit

Home-workout app that keeps you consistent and adapts to your progress.
Part of the Vibranic suite. Project notes live in Kilian's vault
(`KF OS/03 Projects/vibrafit/CLAUDE.md`).

```bash
npm install
npm run dev   # http://localhost:3003
```

## Database

```bash
npm run db:migrate   # dev: create/apply a migration
npm run db:deploy    # production: apply migrations
npm run db:seed      # the exercise catalog (safe to re-run)
```

The exercise catalog lives in `server/data/exercises.ts`, not in a migration.
**After `db:deploy` on a new database (production included) run `npm run db:seed` once,**
and again whenever the catalog changes. Until then, generating a program fails
with `catalog_missing`. The starter program itself is data in `server/data/program.ts`.
