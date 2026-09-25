# Adda_Box Chat App

A real-time chat application built with Node.js, Express, MongoDB, and Socket.IO. Users can register, sign in, join named rooms, exchange messages, and see who is online.

## Demo and screenshot

[Render deployment](https://adda-box-chat-app.onrender.com)

![Adda_Box chat interface](website%20screenshot.png)

The deployment may need time to start if the hosting service has put it to sleep. Its current availability has not been verified for this documentation update.

**Hosting requirement:** this application needs a running Node.js server and MongoDB. GitHub Pages cannot run this backend. The frontend calls `/api/...` and `/socket.io/...` on the same host, so open the app through the Node.js server rather than opening `public/index.html` directly.

## Features

- Registration with email validation and password rules.
- Login using JWTs that expire after seven days; localStorage saves the token to restore sessions.
- Named chat rooms, with `general` prefilled in the interface.
- Real-time messages through Socket.IO and message storage in MongoDB.
- A **Load Last 50** button for a room's recent message history.
- Online presence tracking, including multiple connections for the same user.
- A frontend styled with Tailwind CSS loaded from a CDN.

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

1. Register with a name of at least two characters and a valid email. Passwords need at least eight characters, including lowercase, uppercase, a number, and a special character.
2. Open another browser or a private window and register a second user. Separate browser storage avoids sharing the same saved token.
3. In both windows, enter the same room name and click **Join Room**.
4. Send a message and check that it appears in both windows.
5. Click **Load Last 50** to retrieve stored messages for that room.
6. After a refresh or reconnect, click **Join Room** again to receive live messages. Restoring the login token does not automatically rejoin the room.

Rooms currently group conversations; they do not have private membership or invitation controls.

## Project layout

| Path | Responsibility |
| --- | --- |
| `public/index.html` | Chat interface, authentication requests, and Socket.IO client |
| `src/server.js` | Express setup, static files, API routes, and server startup |
| `src/config/db.js` | MongoDB connection |
| `src/config/env.js` | Startup checks for required configuration and port settings |
| `src/middleware/auth.js` | JWT verification for protected HTTP endpoints |
| `src/models/` | User and message schemas |
| `src/routes/` | Authentication, message history, and user lookup endpoints |
| `src/socket.js` | Socket authentication, room joins, live messaging, and presence |
| `.env.example` | Sample local environment configuration |

## HTTP endpoints

| Method | Path | Purpose | Authentication |
| --- | --- | --- | --- |
| GET | `/healthz` | Returns `{"ok":true}` when the HTTP server responds | None |
| POST | `/api/auth/register` | Register with `name`, `email`, and `password` | None |
| POST | `/api/auth/login` | Sign in with `email` and `password` | None |
| GET | `/api/messages/:room` | Retrieve the latest 50 messages, oldest first within that batch | Bearer token |
| POST | `/api/users/lookup` | Look up users using an `ids` array | Bearer token |

Protected requests use `Authorization: Bearer <token>`. The health endpoint checks the HTTP response; it does not recheck the database on each request.

## Deployment configuration

For a Node.js hosting service such as Render:

- Install command: `npm ci`.
- Start command: `npm start`.
- Configure `MONGO_URI` and `JWT_SECRET` in the hosting service's environment settings.
- Set `CORS_ORIGIN` to the public app origin, such as `https://adda-box-chat-app.onrender.com`, without a trailing slash.
- Allow the hosting service to supply `PORT` where supported.
- Configure Atlas network access for the deployed server.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Invalid configuration` | Fix the variables listed in the startup error: supply `MONGO_URI` and `JWT_SECRET`, replace the example secret, and use a valid port. |
| `DB connection failed` | Check MongoDB availability, credentials, and Atlas network access. The HTTP server starts only after the initial database connection succeeds. |
| Login or registration fails after database connection | Ensure `JWT_SECRET` is configured and check the server logs. |
| Interface opens but live messages do not arrive | Join the same room in both windows; rejoin after reconnecting. |
| API or Socket.IO requests fail on GitHub Pages or a local HTML file | Open the app through the Node.js server, which supplies these endpoints. |
| Session expired or token invalid | Log in again; tokens expire after seven days and become invalid if the JWT secret changes. |

## Security and development notes

Passwords are hashed with bcrypt, and protected HTTP routes and socket connections verify JWTs. Tokens are stored in localStorage, and room access is not restricted by membership. Review these choices before handling sensitive conversations.

Run the configuration regression tests with:

```bash
npm test
```

These tests use Node.js's built-in test runner and need no database or real credentials. They cover required settings, the sample secret, port validation, and safe error messages. They do not test live authentication or messaging; use the conversation steps above for a manual smoke check.

## Improvement reports

[Report 01: local setup and documentation](docs/improvement-report-01.md)

[Report 02: startup configuration validation](docs/improvement-report-02.md)

## License

[MIT](LICENSE)
