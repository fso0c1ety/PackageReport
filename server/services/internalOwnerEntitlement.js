const INTERNAL_OWNER_EMAILS = Object.freeze([
  "a.gjendzz@gmail.com",
  "valitv7@gmail.com",
  "bleonahalili8@gmail.com",
]);

function isInternalOwnerEmail(email) {
  return INTERNAL_OWNER_EMAILS.includes(String(email || "").trim().toLowerCase());
}

module.exports = { INTERNAL_OWNER_EMAILS, isInternalOwnerEmail };
