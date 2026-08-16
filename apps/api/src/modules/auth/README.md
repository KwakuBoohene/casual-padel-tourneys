# Auth module (Modular Hexagonal)

Every way a player gets a session: guest, Google, magic link, OPAQUE password, password
reset, and the attach flows that upgrade a guest into a real account.

```text
http/            → Fastify adapters (validate → use-case → mapAuthError) + shared preHandlers
application/     → use-cases + ports (users, magic tokens, mailer, OPAQUE, JWT, Google)
domain/          → AuthUser projection, email normalisation, TTLs and client-visible copy
infrastructure/  → Prisma, mail, jsonwebtoken, google-auth-library and OPAQUE adapters
```

**Dependency rule:** `http → application → domain`; infrastructure implements ports;
`application/` and `domain/` never import Fastify, Prisma, jsonwebtoken or `@serenity-kit/opaque`.

## Clusters

| Cluster | Routes | Use-cases |
|---------|--------|-----------|
| Session | `POST /auth/google`, `POST /auth/guest` | `googleSignIn`, `guestSignIn` |
| Me | `GET /auth/me`, `POST /auth/verify/resend` | `session.ts` |
| Magic link | `POST /auth/magic-link[/consume]` | `magicLink.ts` |
| Password | `POST /auth/password/{register,login}/{start,finish}` | `passwordRegister.ts`, `passwordLogin.ts` |
| Reset | `POST /auth/password/reset[/consume,/register/*]` | `passwordReset.ts` |
| Attach | `POST /auth/attach/{email,google,password/register/*}` | `attachIdentity.ts`, `attachPassword.ts` |

## Layout notes

- **Crypto is wrapped, never rewritten.** `OpaquePasswordProtocol`, `JwtAuthTokens` and
  `PrismaMagicTokenStore` delegate to the existing `lib/passwordProtocol.ts`,
  `jsonwebtoken` and `lib/magicTokens.ts` helpers. Tests still import those lib modules
  directly, so they stay put.
- **`lib/auth.ts` is a re-export shim.** Tournament, KOH and organizer-player routes keep
  importing `requireOrganizerAccess` from there; the implementation is `http/preHandlers.ts`.
- **Error contract has two shapes.** Most routes answer `{ message }` via `mapAuthError`.
  `/auth/google`, `/auth/guest` and `/auth/me` have always thrown, so `rethrowAuthError`
  preserves Fastify's `{ statusCode, error, message }` envelope. The one exception is the
  `/auth/google` 409, which has always been a plain body.
- **Generic responses are deliberate.** Magic-link and reset requests swallow failures and
  always return the same message so the endpoints cannot be used to enumerate accounts.
- `POST /auth/verify/resend` keeps its 5-per-15-minutes rate limit; every other auth route
  inherits the global 100/minute limit from `app.ts`.

## Still shared with `lib/`

`lib/passwordProtocol.ts`, `lib/passwordLoginAttempts.ts`, `lib/passwordResetTickets.ts`,
`lib/magicTokens.ts`, `lib/mail/**` and `lib/authTypes.ts`. Login attempts and reset tickets
are in-process TTL maps — moving them to Redis means replacing an adapter, not a use-case.
