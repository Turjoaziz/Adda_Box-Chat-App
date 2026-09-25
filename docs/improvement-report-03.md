# Improvement report 03: reconnect chat rooms and protect offline drafts

Date: 25 September 2026

## The problem

The frontend previously connected to Socket.IO without restoring room membership after a network interruption. A user could appear connected but stop receiving room messages until clicking Join Room again. Send and Join also checked only whether a socket object existed, rather than whether it was connected. Clicking Send offline could queue a message and immediately clear its draft.

Logout disconnected the socket only while it was connected, leaving a disconnected socket's reconnect attempts active.

## What changed and why

| Change | Benefit |
| --- | --- |
| Remember confirmed room names for the current login | The app rejoins these rooms automatically after a temporary disconnection |
| Track room readiness separately on each connection | Sending waits until the server confirms that the room has been rejoined |
| Display connection status with `role="status"` | Users can see whether the chat is connecting, connected, or disconnected; assistive technology can announce updates |
| Keep the draft when Send is clicked offline or before room confirmation | The app explains why it did not send, without discarding the text or silently queueing a new message |
| Log room joins only after `room:joined` arrives | The interface no longer claims a join succeeded before the server confirms it |
| Clean up sockets and listeners even while disconnected | Logout and replacing a connection stop old reconnect attempts and prevent stale callbacks |
| Clear remembered rooms on logout or a new login | The next login starts with no previously joined rooms |
| Add eight frontend regression tests | The reconnect, draft, and cleanup behavior can be checked with `npm test` |

## Example

You join `general`, then your network connection drops. The app shows that it is disconnected. If you type a message and click Send, the message stays in the input box. When the connection returns, the app requests the room again and reports the server's confirmation. You can then click Send to submit your draft.

## Verification

- `npm test`: all 15 tests passed (eight new frontend tests plus the seven existing configuration tests).
- The frontend tests run the actual inline script from `public/index.html` in a Node.js VM with simulated DOM and Socket.IO objects.
- Covered confirmation timing, restoring multiple rooms without duplicate rejoin requests, offline send/join blocking, waiting for room confirmation, unjoined-room sends, logout while offline, replacing disconnected sockets, and invalid-token cleanup.
- `git diff --check`: passed.

Tests ran on Node.js 24.19.0. The project declares Node.js versions 18–22, so verification on a supported runtime remains outstanding. No real browser, live database, or two-user network conversation was tested. These are client behavior tests, not proof of live deployment health.

## Limits and deployment

- A full page refresh clears remembered rooms and drafts. After refreshing or starting a new login, click Join Room again.
- Automatic reconnection restores only rooms previously confirmed by the server in this page session.
- Missed messages are not automatically replayed. Load Last 50 retrieves recent stored messages.
- Messages already emitted when the connection fails still have no delivery acknowledgement or guaranteed retry. This change protects a draft when the client already knows it is offline.
- The client-side room check improves the interface; it is not server-side room access control.
- The change is available from the Node.js host once that host deploys this commit. Updating GitHub does not itself verify the hosting deployment.

## What you can learn

- **Connection state:** having a socket object does not mean it is currently connected.
- **Event confirmation:** request an action first, then report success after the server confirms it.
- **Separate state:** remembering desired rooms differs from knowing which rooms are ready on the current connection.
- **Cleanup:** remove old event listeners and stop old connections when logging out or replacing a session.
