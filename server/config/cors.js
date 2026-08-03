const cors = require("cors");

function createCorsMiddleware(allowedOrigins) {
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error("Origin not allowed by CORS");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  });
}

function socketCorsOptions(allowedOrigins) {
  return {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  };
}

module.exports = { createCorsMiddleware, socketCorsOptions };
