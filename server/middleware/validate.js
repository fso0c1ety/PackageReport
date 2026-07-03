function requireFields(fields) {
  return function requireFieldsMiddleware(req, res, next) {
    const missing = fields.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || String(value).trim() === "";
    });

    if (missing.length > 0) {
      return res.status(400).json({ error: "Missing required fields", fields: missing });
    }

    next();
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Password must include letters and numbers";
  }
  return null;
}

module.exports = {
  isValidEmail,
  requireFields,
  validatePassword,
};
