const MAX_ADDRESS_LENGTH = 2048;
const ADDRESS_COLUMN_NAME = /(?:^|\b)(address|location|pickup|delivery|origin|destination)(?:\b|$)/i;
const GOOGLE_LOCATION_URL = /^https?:\/\/(?:www\.)?(?:google\.[^/]+\/(?:search|maps)|maps\.google\.)/i;
const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function isAddressColumn(column = {}) {
  return String(column.type || "").toLowerCase() === "location" || ADDRESS_COLUMN_NAME.test(String(column.name || ""));
}

function addressText(value) {
  if (value == null) return "";
  if (typeof value === "object" && !Array.isArray(value)) {
    const address = value.address == null ? "" : String(value.address);
    return address || String(value.label ?? "");
  }
  return String(value);
}

function validateInternationalAddress(value) {
  const text = addressText(value);
  if (!text) return { valid: true, error: null };
  if (text.length > MAX_ADDRESS_LENGTH) return { valid: false, error: `Address must be ${MAX_ADDRESS_LENGTH} characters or fewer` };
  if (UNSAFE_CONTROL_CHARACTERS.test(text)) return { valid: false, error: "Address contains unsupported control characters" };
  if (GOOGLE_LOCATION_URL.test(text.trim())) return { valid: false, error: "Enter the postal address, not a Google search or maps URL" };
  return { valid: true, error: null };
}

function normalizeInternationalAddress(value) {
  if (value == null) return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const text = addressText(value);
    return { ...value, address: text, label: String(value.label ?? text) };
  }
  return String(value);
}

function internationalAddressSearchText(value) {
  return addressText(value).normalize("NFC").toLocaleLowerCase();
}

module.exports = {
  MAX_ADDRESS_LENGTH,
  addressText,
  internationalAddressSearchText,
  isAddressColumn,
  normalizeInternationalAddress,
  validateInternationalAddress,
};
