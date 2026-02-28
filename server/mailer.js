const { Resend } = require('resend');

// Initialize Resend with the API key from environment variables
// Local development usually loads this from a .env file, while Render sets it in the dashboard
const resend = new Resend(process.env.RESEND_API_KEY || 're_BzKYitT8_JW9Vv8YjHNb8Rdc71C7rxqa7');

async function sendEmail({ to, subject, text, html }) {
    console.log('[MAILER] Attempting to send email via Resend:', { to, subject });

    if (!to || (Array.isArray(to) && to.length === 0)) {
        console.log('[MAILER] No recipients provided');
        return;
    }

    // Resend requires an array of strings for multiple recipients
    const recipients = Array.isArray(to) ? to : [to];

    // Create a timeout promise as a safety measure (though Resend API rarely hangs like SMTP)
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Resend API request timed out after 30 seconds')), 30000)
    );

    try {
        const { data, error } = await Promise.race([
            resend.emails.send({
                from: 'onboarding@resend.dev', // Resend's default testing domain
                to: recipients,
                subject,
                text: text || "Email from PackageReport", // Resend requires either text or html
                html,
            }),
            timeoutPromise
        ]);

        if (error) {
            console.error('[MAILER] Resend API Error:', error);
            throw new Error(error.message || 'Unknown Resend API Error');
        }

        console.log('[MAILER] Email sent successfully via Resend:', data?.id);
        return data;
    } catch (err) {
        console.error('[MAILER] Exception during email send:', err);
        throw err;
    }
}

module.exports = { sendEmail };
