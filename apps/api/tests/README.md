# API tests

Mirrors `../src/`. Put `*.test.ts` here (e.g. `src/routes/foo.ts` → `tests/routes/foo.test.ts`).

```bash
npm test --workspace=@padel/api
```

## Atomic tournament save regression tests

Use a disposable database with the migrations applied. From `apps/api`, set
`TEST_DATABASE_URL` to that database's connection string, then run:

```bash
DATABASE_URL="$TEST_DATABASE_URL" node --import tsx --test tests/modules/tournament/repository.save.test.ts
```

These tests verify rollback after a failed replacement, successful saves, and competing
updates. They are skipped when `TEST_DATABASE_URL` is unset.
