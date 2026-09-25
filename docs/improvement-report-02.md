# Improvement report 02: catch configuration problems at startup

Date: 25 September 2026

## The problem

The app previously checked for a missing database URI when connecting to MongoDB, but it did not check for a missing JWT secret before starting the HTTP server. A server could therefore start successfully and then fail while signing a token during registration or login. Invalid port values were also passed directly to the HTTP server.

## What changed and why

| File | Change | Benefit |
| --- | --- | --- |
| `src/config/env.js` | Added a small configuration validator | Reports missing or blank `MONGO_URI` and `JWT_SECRET` together, so setup mistakes are easier to diagnose |
| `src/config/env.js` | Rejects the JWT placeholder from `.env.example` | Prevents accidentally running with the publicly documented example secret |
| `src/config/env.js` | Validates `PORT` and returns a numeric port | Rejects invalid numbers and text; omitted or empty values still default to 4000 |
| `src/server.js` | Runs validation before creating the app or connecting to MongoDB | Stops startup with exit code 1 and a clear message instead of allowing a partially configured server to run |
| `test/env.test.js` | Added seven automated regression tests | Checks valid settings, missing values, the placeholder, port boundaries, and errors that do not print secrets |
| `package.json` | Added `npm test` using Node's built-in test runner | Makes the checks easy to repeat without a new test dependency |
| `README.md` | Added validation behavior, test instructions, and troubleshooting | Keeps the setup guide aligned with the new behavior |

## Example

Before: MongoDB could connect and the server could start even if `JWT_SECRET` was missing. The problem would appear when someone registered or logged in.

Now: startup stops immediately with a message such as:

```text
Invalid configuration:
- JWT_SECRET is required.
Check your .env file or hosting environment settings.
```

The validation message lists variable names and fixes, never their supplied values.

## Verification

- `npm ci --no-audit --no-fund`: installed the existing locked dependencies successfully; no dependency or lockfile changes.
- `npm test`: all seven automated tests passed.
- `node --check src/server.js`: passed.
- `git diff --check`: passed.
- Ran the actual server command in three separate processes: missing required settings, an unchanged sample JWT secret, and an invalid port. All exited with code 1 and the expected configuration message, without a server-listening message or database error. The validation call precedes the database connection in the source.

The available runtime was Node.js 24.19.0, outside the project's declared range (`>=18 <23`), so npm emitted an engine warning. These results do not replace verification on the project's supported Node.js version. Existing dependencies also emitted deprecation warnings during installation.

Live MongoDB connectivity, successful registration/login, and real-time conversations were not tested because no live database credentials were supplied. The validator checks configuration presence and port format; it does not prove that a database URI works or that every possible JWT secret is strong.

## What you can learn

- **Startup validation** checks essential settings before accepting requests.
- **Fail early** means reporting a setup error immediately, while the cause is clear.
- **Regression tests** help catch future edits that accidentally remove working checks.
- **Exit code 1** tells the terminal or hosting service that startup failed.

## Effect on deployment

Existing deployments with a real nonblank JWT secret, a database URI, and a valid port should keep the same startup behavior. A deployment using the sample JWT placeholder, missing settings, or an invalid port will now stop until those settings are corrected. An omitted or empty port still uses 4000.

This update does not change the chat interface or implement automatic room rejoining. The commit records today's actual work; no future daily updates are scheduled by this change.
