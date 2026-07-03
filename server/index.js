// Production entrypoint. server/server.js still contains legacy route wiring;
// new modules are extracted under server/{config,middleware,services,jobs,db}.
require("./server");
