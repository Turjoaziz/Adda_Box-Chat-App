# Adda_Box Chat App

A real-time group chat application built with Node.js, Express, MongoDB, and Socket.IO. Adda Box supports public and password-protected private groups, end-to-end encrypted new messages, device signatures, responsive light/dark interfaces, presence, and password recovery.

## Demo and screenshot

[Render deployment](https://adda-box-chat-app.onrender.com)

![Adda_Box chat interface](website%20screenshot.png)

The Render service may need a short cold-start delay on the free tier.

**Hosting requirement:** this application needs a running Node.js server and MongoDB. GitHub Pages cannot run this backend. The frontend calls `/api/...` and `/socket.io/...` on the same host, so open the app through the Node.js server rather than opening `public/index.html` directly.

## Features

- Registration and login with JWT authentication and bcrypt password hashing.
- Three-step interface: **Login / Sign Up → Groups → Chat**.
- Public groups that any authenticated user can enter.
- Password-protected private groups with server-side access checks for both live chat and saved history.
- Server-side protection against duplicate and confusingly similar group names.
- End-to-end encryption for **new messages** using browser-side AES-256-GCM encryption and per-device wrapped message keys.
- Per-device ECDSA digital signatures so clients can verify message authenticity and detect tampering.
- Legacy plaintext history remains readable for compatibility; newly encrypted messages are stored as ciphertext.
- MongoDB message history with the latest 50 messages available per group.
- Real-time messaging and online presence through Socket.IO.
- Reconnection handling and automatic rejoin of previously confirmed groups.
- Responsive layouts for desktop, tablet, and mobile.
- Light and dark themes with the preference saved locally.
- Forgot-password flow with one-time reset tokens that expire after 15 minutes.
- Gmail SMTP password-reset delivery via Nodemailer, with optional Resend fallback.
- Automated Node.js tests for environment validation, reconnect behavior, room validation, group-name collisions, cryptographic signatures, encrypted payload tampering, and reset-email configuration.

## Run locally

### Requirements

- Node.js 22, within the range declared in `package.json` (`>=18 <23`).
- npm, Git, and a running local MongoDB instance or MongoDB Atlas connection string.
- Internet access for the frontend's Tailwind CDN.

### 1. Install dependencies

```bash
git clone https://github.com/Turjoaziz/Adda_Box-Chat-App.git
cd Adda_Box-Chat-App
npm ci
```

### 2. Configure the environment

Copy `.env.example` to `.env` in the project root.

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set `MONGO_URI` to your MongoDB connection string. For Atlas, configure a database user and network access for the machine running the server.

Generate a random JWT secret and paste the output into `JWT_SECRET` in `.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Variable | Purpose | Local configuration |
| --- | --- | --- |
| `MONGO_URI` | Required MongoDB connection string | `mongodb://127.0.0.1:27017/adda_box` |
| `JWT_SECRET` | Required secret used to sign and verify login tokens | Replace the example placeholder with a generated secret |
| `PORT` | HTTP server port; defaults to `4000` | `4000` |
| `CORS_ORIGIN` | Allowed browser origin | `http://localhost:4000` |
| `PASSWORD_RESET_BASE_URL` | Public URL placed in password-reset links | `http://localhost:4000` locally |
| `SMTP_USER` | Gmail account used for password-reset email | Your Gmail address |
| `SMTP_PASS` | Google App Password for Gmail SMTP | A Google App Password, not the normal account password |
| `SMTP_FROM` | Optional display sender for SMTP | e.g. `Adda Box <your-address@gmail.com>` |
| `RESEND_API_KEY` | Optional fallback email provider | Leave empty when Gmail SMTP is used |
| `RESET_EMAIL_FROM` | Resend fallback sender | Required only when using Resend |

Keep `.env` private; `.gitignore` already excludes it. `.env.example` contains only sample values. If you change the port, update the origin and browser URL too. Changing `JWT_SECRET` invalidates existing login tokens.

Before connecting to MongoDB, the server checks that `MONGO_URI` and `JWT_SECRET` are present and nonblank. It rejects the example JWT placeholder and invalid ports (`PORT` must be a whole number from 1 to 65535). If configuration is invalid, startup stops with an error listing the settings to fix, without printing their values.

The HTTP API accepts comma-separated origins, but the current server passes only the first origin to Socket.IO. Use a single origin for this setup. Leaving `CORS_ORIGIN` empty permits any origin for HTTP API CORS; use an explicit origin for deployment.

### 3. Start the application

```bash
npm run dev
```

Open **http://localhost:4000** after the server reports that MongoDB is connected. Run commands from the project root because the server serves the relative `public` directory.

For normal operation without file watching:

```bash
npm start
```

## Try a conversation

1. Register with a valid email and a password that satisfies the displayed password rules.
2. After authentication, choose a **public group** or create a new group.
3. To test a private group, create one with a password and open it from another account.
4. Open another browser/private window and sign in as a second user.
5. Join the same group from both accounts.
6. Send new messages and confirm that they appear with **Encrypted 🔒** and **Signed ✓** indicators.
7. Use **Load last 50** to retrieve stored history.
8. Temporarily disconnect and reconnect the network to confirm that the socket reconnects and previously confirmed groups rejoin.
9. Use **Forgot password?** from the login screen to test the reset-email flow after SMTP is configured.

New encrypted messages can only be decrypted by devices that received the corresponding encrypted message key. A newly registered device cannot automatically decrypt earlier encrypted messages unless a future key-backup/history-sharing mechanism is added.

## Project layout

| Path | Responsibility |
| --- | --- |
| `public/index.html` | Chat interface, authentication requests, and Socket.IO client |
| `src/server.js` | Express setup, static files, API routes, and server startup |
| `src/config/db.js` | MongoDB connection |
| `src/config/env.js` | Startup checks for required configuration and port settings |
| `src/middleware/auth.js` | JWT verification for protected HTTP endpoints |
| `src/models/` | User, message, group, group-membership, and per-device cryptographic key schemas |
| `src/routes/` | Authentication, groups, device keys, encrypted history, and user lookup endpoints |
| `src/services/` | Group validation, cryptographic verification, and password-reset email delivery |
| `src/socket.js` | Socket authentication, group joins, encrypted message validation, signatures, and presence |
| `.env.example` | Sample local environment configuration |

## HTTP endpoints

| Method | Path | Purpose | Authentication |
| --- | --- | --- | --- |
| GET | `/healthz` | Basic HTTP health response | None |
| POST | `/api/auth/register` | Register an account | None |
| POST | `/api/auth/login` | Sign in | None |
| POST | `/api/auth/forgot-password` | Request a one-time password reset link | None |
| POST | `/api/auth/reset-password` | Set a new password using a valid reset token | None |
| GET | `/api/groups` | List public and private groups | Bearer token |
| POST | `/api/groups` | Create a public or private group | Bearer token |
| GET | `/api/groups/:slug/recipients` | Retrieve encryption-ready device public keys for group members | Bearer token; private-group password when required |
| GET | `/api/messages/:room` | Retrieve the latest 50 saved messages | Bearer token; private-group password when required |
| POST | `/api/keys/register` | Register the current device signing/encryption public keys | Bearer token |
| GET | `/api/keys/:userId/:deviceId` | Retrieve a device public-key bundle | Bearer token |
| POST | `/api/users/lookup` | Resolve user IDs to display names | Bearer token |

Protected requests use `Authorization: Bearer <token>`. Private group history and key-recipient requests also require the private-group password.

## Deployment configuration

For a Node.js hosting service such as Render:

- Install command: `npm ci`.
- Start command: `npm start`.
- Configure `MONGO_URI` and `JWT_SECRET` in the hosting service's environment settings.
- Set `CORS_ORIGIN` and `PASSWORD_RESET_BASE_URL` to the public app origin, such as `https://adda-box-chat-app.onrender.com`.
- For free password-reset delivery, configure `SMTP_USER` and a Google `SMTP_PASS` App Password. Resend can remain as an optional fallback.
- Allow the hosting service to supply `PORT` where supported.
- Configure Atlas network access for the deployed server.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Invalid configuration` | Fix the variables listed in the startup error: supply `MONGO_URI` and `JWT_SECRET`, replace the example secret, and use a valid port. |
| `DB connection failed` | Check MongoDB availability, credentials, and Atlas network access. The HTTP server starts only after the initial database connection succeeds. |
| `querySrv ENOTFOUND` for a MongoDB Atlas host | The hostname in `MONGO_URI` may be old, deleted, or mistyped. Copy a fresh connection string from Atlas and update the deployment environment variable. |
| Login or registration fails after database connection | Ensure `JWT_SECRET` is configured and check the server logs. |
| Interface opens but live messages do not arrive | Join the same room in both windows. After a temporary disconnect, wait for the connection and room confirmations; after a full refresh, join the room again. |
| API or Socket.IO requests fail on GitHub Pages or a local HTML file | Open the app through the Node.js server, which supplies these endpoints. |
| Session expired or token invalid | Log in again; tokens expire after seven days and become invalid if the JWT secret changes. |

## Security and development notes

Passwords are hashed with bcrypt. JWTs protect authenticated HTTP and Socket.IO access. New messages are encrypted in the browser before they are sent to the server, and the server stores ciphertext plus wrapped message keys rather than plaintext for those messages. New encrypted payloads are also digitally signed by the sending device and verified before storage.

The current encryption design is **not a full Signal Protocol implementation** and does not yet provide Double Ratchet forward secrecy or safety-number verification. Treat it as a strong project-level E2EE implementation, not a claim of WhatsApp/Signal protocol equivalence.

Device cryptographic private keys are stored in the browser's IndexedDB. Clearing browser storage can create a new device identity and can make earlier encrypted messages unavailable on that browser.

Private-group passwords control entry to private groups; they are separate from the cryptographic keys used to encrypt chat messages.

Password-reset links are single-use, expire after 15 minutes, and the server stores only a SHA-256 hash of the reset token. Gmail SMTP uses a Google App Password rather than the account's normal password.

Run the regression tests with:

```bash
npm test
```

The test suite uses Node.js's built-in test runner and does not require production credentials. It covers configuration validation, chat reconnection and validation, group-name collision rules, cryptographic signatures, encrypted-message tamper detection, signed encryption-key bindings, and password-reset email configuration.

## Improvement reports

[Report 01: local setup and documentation](docs/improvement-report-01.md)

[Report 02: startup configuration validation](docs/improvement-report-02.md)

[Report 03: chat reconnection and offline drafts](docs/improvement-report-03.md)

## License

[MIT](LICENSE)
