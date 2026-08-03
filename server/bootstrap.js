function listen(server, port, logger = console) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      server.removeListener("error", reject);
      logger.info?.("server_ready", { port });
      resolve(server);
    });
  });
}

async function bootstrap({ app, beforeStart, handle, nextApp, server, port, skipNextApp, logger = console }) {
  if (beforeStart) await beforeStart();
  if (!skipNextApp) {
    await nextApp.prepare();
    app.all(/(.*)/, (req, res) => handle(req, res));
  }
  return listen(server, port, logger);
}

module.exports = { bootstrap, listen };
