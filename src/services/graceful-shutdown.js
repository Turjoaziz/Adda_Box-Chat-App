export function createGracefulShutdown({
  server,
  disconnect,
  exit = code => process.exit(code),
  logger = console,
  timeoutMs = 10_000,
  schedule = setTimeout,
  cancel = clearTimeout
}) {
  let shuttingDown = false;
  let finished = false;

  function complete(code, timer) {
    if (finished) return;
    finished = true;
    cancel(timer);
    exit(code);
  }

  return function shutdown(signal = "shutdown") {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.log(`${signal} received; shutting down gracefully.`);

    const timer = schedule(() => {
      logger.error("Graceful shutdown timed out.");
      complete(1, timer);
    }, timeoutMs);
    timer?.unref?.();

    const finish = async (code = 0) => {
      try {
        await disconnect();
      } catch (err) {
        logger.error("Database disconnect failed:", err);
        code = 1;
      }

      complete(code, timer);
    };

    if (!server?.listening) {
      void finish();
      return;
    }

    server.close(err => {
      if (err) {
        logger.error("HTTP server close failed:", err);
        void finish(1);
        return;
      }

      void finish();
    });
  };
}
