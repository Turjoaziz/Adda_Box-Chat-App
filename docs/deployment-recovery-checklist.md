# Deployment recovery checklist

Use this checklist when Adda_Box builds successfully but fails before the server starts.

- Confirm `MONGO_URI` is set in the hosting environment.
- If logs show `querySrv ENOTFOUND`, copy a fresh MongoDB Atlas connection string and replace the old hostname.
- Keep the real database URI in Render or a local `.env` file, never in GitHub.
- Confirm the Atlas database user still exists and has the correct password.
- Confirm Atlas Network Access allows the deployed service to connect.
- Keep `CORS_ORIGIN` matched to the deployed Adda_Box URL.
- After updating environment variables, redeploy and look for `MongoDB connected` before testing login and chat history.

This checklist documents the deployment failure diagnosed on 27 September 2026 and keeps the recovery steps close to the project.

## Browser connection failures

- Inspect the browser Network tab for CORS errors.
- Configure `CORS_ORIGIN` with comma-separated trusted origins (scheme, host and optional port, without paths or trailing slashes).
- Redeploy and test login and chat from each approved frontend.
- Confirm unlisted origins are rejected. A curl request without an Origin header is not sufficient to verify browser CORS behavior.

## Post-deployment chat smoke test

Use two separate browser sessions with test accounts to verify real-time messaging after a deployment.

1. Sign in, join the same room in both sessions, and send a harmless test message in each direction.
2. Disconnect one session from the network, type a draft, and attempt to send. Confirm the draft remains and no offline message is queued.
3. Restore connectivity, wait for room confirmation, and send the draft. Verify the other session receives it once.
4. Log out and sign in again. Confirm the previous session's room subscriptions are not automatically restored.

For local regression checks, run `node --test test/chat-reconnect.test.js` from the repository root. These tests use simulated browser and socket objects; they do not replace the live deployment smoke test.
