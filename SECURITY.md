# Security Policy

## Reporting a vulnerability

If you discover a security issue in Adda Box, please avoid publishing sensitive details publicly before the issue has been reviewed.

A useful report should include:

- a clear description of the issue
- steps to reproduce it
- the affected feature, route, or workflow
- the potential security impact
- any suggested mitigation, if known

Please use GitHub's private vulnerability reporting feature when it is available for this repository. Otherwise, open a minimal issue that does not include exploit details and ask for a private follow-up channel.

## Security scope

Adda Box includes several project-level security controls, including:

- JWT authentication with password-change invalidation
- password-reset expiry, cooldowns, and burst limiting
- strict Bearer-token and Socket.IO token handling
- API input and content-type validation
- no-store handling for sensitive API responses
- security-focused browser headers
- production dependency auditing in CI
- signed browser device identities
- browser-based encrypted message delivery

## Encryption limitations

Adda Box uses a project-level browser end-to-end encryption design. It is intended to prevent the server from receiving plaintext for newly encrypted messages, but it should not be treated as equivalent to mature protocols such as Signal's Double Ratchet.

In particular, the project does not currently provide Signal-style forward secrecy, a Double Ratchet, or safety-number verification. A newly registered device may also be unable to decrypt older encrypted messages unless a compatible message-key envelope already exists for that device.

## Supported versions

Security fixes are applied to the current `main` branch and the live deployment. Older commits and forks are not maintained as supported releases.
