const assert = require("node:assert/strict");
const test = require("node:test");

test("legacy server mailer uses the runtime Fetch API and clears its timeout", async () => {
  const previous = {
    apiKey: process.env.BREVO_API_KEY,
    sender: process.env.BREVO_SENDER_EMAIL,
    fetch: globalThis.fetch,
  };
  process.env.BREVO_API_KEY = "test-key";
  process.env.BREVO_SENDER_EMAIL = "sender@example.test";

  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 201,
      json: async () => ({ messageId: "test-message" }),
    };
  };

  const modulePath = require.resolve("../server/mailer");
  delete require.cache[modulePath];
  const { sendEmailNow } = require(modulePath);

  try {
    const result = await sendEmailNow({
      to: ["recipient@example.test"],
      subject: "Automation acceptance",
      text: "Status changed",
    });
    assert.equal(result.messageId, "test-message");
    assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(request.options.method, "POST");
    assert.ok(request.options.signal instanceof AbortSignal);
    assert.equal(JSON.parse(request.options.body).to[0].email, "recipient@example.test");
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.apiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previous.apiKey;
    if (previous.sender === undefined) delete process.env.BREVO_SENDER_EMAIL;
    else process.env.BREVO_SENDER_EMAIL = previous.sender;
    delete require.cache[modulePath];
  }
});

test("legacy server mailer no longer bundles node-fetch", () => {
  const fs = require("node:fs");
  const source = fs.readFileSync(require.resolve("../server/mailer"), "utf8");
  assert.doesNotMatch(source, /require\(['\"]node-fetch['\"]\)/);
  assert.match(source, /globalThis\.fetch/);
  assert.match(source, /clearTimeout\(timeoutId\)/);
});
