function filterExistingRecipients(recipientIds, userRows) {
  const existing = new Set(userRows.map((row) => String(row.id)));
  return recipientIds.filter((recipientId) => existing.has(String(recipientId)));
}

module.exports = { filterExistingRecipients };
