const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    pool: false, // Disable connection pooling to ensure fresh connections
    auth: {
        user: 'valonhalili74@gmail.com',
        pass: 'aoyojljhvpwhrswg',
    },
    tls: {
        rejectUnauthorized: false
    }
});

async function sendEmail({ to, subject, text, html }) {
    console.log('[MAILER] Attempting to send email:', { to, subject });
    if (!to || (Array.isArray(to) && to.length === 0)) {
        console.log('[MAILER] No recipients provided');
        return;
    }

    const recipients = Array.isArray(to) ? to.join(', ') : to;

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email sending timed out after 30 seconds')), 30000)
    );

    try {
        const info = await Promise.race([
            transporter.sendMail({
                from: 'valonhalili74@gmail.com',
                to: recipients,
                subject,
                text,
                html,
            }),
            timeoutPromise
        ]);
        console.log('[MAILER] Email sent:', info.messageId);
        return info;
    } catch (err) {
        console.error('[MAILER] Error sending email:', err);
        throw err;
    }
}

module.exports = { sendEmail };
