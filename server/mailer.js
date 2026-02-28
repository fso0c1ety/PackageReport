const fetch = require('node-fetch');

// The Brevo API Key
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail({ to, subject, text, html }) {
    console.log('[MAILER] Attempting to send email via Brevo:', { to, subject });

    if (!to || (Array.isArray(to) && to.length === 0)) {
        console.log('[MAILER] No recipients provided');
        return;
    }

    // Convert string array to Brevo format: [ { email: "user@domain.com" }, ... ]
    const recipientsArray = Array.isArray(to) ? to : [to];
    const brevoTo = recipientsArray.map(emailStr => ({ email: emailStr.trim() }));

    const payload = {
        sender: {
            name: "Smart Manage App",
            email: "valonhalili74@gmail.com" // This MUST be the verified sender in Brevo
        },
        to: brevoTo,
        subject: subject,
    };

    if (html) {
        payload.htmlContent = html;
    }
    if (text) {
        payload.textContent = text;
    }
    // If neither is provided, Brevo requires at least one content type
    if (!html && !text) {
        payload.textContent = "Message from Smart Manage";
    }

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Brevo API request timed out after 30 seconds')), 30000)
    );

    try {
        const fetchPromise = fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': BREVO_API_KEY
            },
            body: JSON.stringify(payload)
        });

        // Race the API call against the timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        // Brevo returns 201 Created for a successful send
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[MAILER] Brevo API Error (${response.status}):`, errorText);
            throw new Error(`Brevo API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('[MAILER] Email sent successfully via Brevo. Message ID:', data.messageId);
        return data;

    } catch (err) {
        console.error('[MAILER] Exception during email send:', err);
        throw err;
    }
}

module.exports = { sendEmail };
