const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_NAME = process.env.SENDER_NAME || 'Smart Manage App';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'valonhalili74@gmail.com';

export async function sendEmail({ to, subject, text, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;

  const recipientsArray = Array.isArray(to) ? to : [to];
  const brevoTo = recipientsArray.map((e) => ({ email: e.trim() }));

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: brevoTo,
    subject,
  };
  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;
  if (!html && !text) payload.textContent = 'Message from Smart Manage';

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Brevo API timed out')), 30000)
  );

  const fetchPromise = fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const response = await Promise.race([fetchPromise, timeout]);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Brevo Error ${response.status}: ${err}`);
  }
  return response.json();
}
