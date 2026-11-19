import test from "node:test";
import assert from "node:assert/strict";
import { createGracefulShutdown } from "../src/services/graceful-shutdown.js";

function nextTurn() {
  return new Promise(resolve => setImmediate(resolve));
}

test("graceful shutdown closes the HTTP server, disconnects the database, and exits cleanly", async () => {
  const calls = [];
  const server = {
    listening: true,
    close(callback) {
      calls.push("close");
      callback();
    }
  };

  const shutdown = createGracefulShutdown({
    server,
    disconnect: async () => {
      calls.push("disconnect");
    },
    exit: code => {
      calls.push(`exit:${code}`);
    },
    logger: { log() {}, error() {} },
    schedule: () => ({ unref() {} }),
    cancel() {}
  });

  shutdown("SIGTERM");
  await nextTurn();

  assert.deepEqual(calls, ["close", "disconnect", "exit:0"]);
});

test("graceful shutdown disconnects directly when the HTTP server is not listening", async () => {
  const calls = [];
  const shutdown = createGracefulShutdown({
    server: { listening: false },
    disconnect: async () => {
      calls.push("disconnect");
    },
    exit: code => {
      calls.push(`exit:${code}`);
    },
    logger: { log() {}, error() {} },
    schedule: () => ({ unref() {} }),
    cancel() {}
  });

  shutdown("SIGINT");
  await nextTurn();

  assert.deepEqual(calls, ["disconnect", "exit:0"]);
});

test("graceful shutdown ignores repeated termination signals", async () => {
  const calls = [];
  let closeCallback;

  const shutdown = createGracefulShutdown({
    server: {
      listening: true,
      close(callback) {
        calls.push("close");
        closeCallback = callback;
      }
    },
    disconnect: async () => {
      calls.push("disconnect");
    },
    exit: code => {
      calls.push(`exit:${code}`);
    },
    logger: { log() {}, error() {} },
    schedule: () => ({ unref() {} }),
    cancel() {}
  });

  shutdown("SIGTERM");
  shutdown("SIGINT");
  closeCallback();
  await nextTurn();

  assert.deepEqual(calls, ["close", "disconnect", "exit:0"]);
});
