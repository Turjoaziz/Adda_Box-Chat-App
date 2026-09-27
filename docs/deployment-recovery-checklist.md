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
