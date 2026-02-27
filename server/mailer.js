const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'valonhalili74@gmail.com',
        pass: 'aoyojljhvpwhrswg',
    },
});

async function sendEmail({ to, subject, text, html }) {
    console.log('[MAILER] Attempting to send email:', { to, subject });
    if (!to || (Array.isArray(to) && to.length === 0)) {
        console.log('[MAILER] No recipients provided');
        return;
    }

    const recipients = Array.isArray(to) ? to.join(', ') : to;

    try {
        const info = await transporter.sendMail({
            from: 'valonhalili74@gmail.com',
            to: recipients,
            subject,
            text,
            html,
        });
        console.log('[MAILER] Email sent:', info.messageId);
        return info;
    } catch (err) {
        console.error('[MAILER] Error sending email:', err);
        throw err;
    }
}

module.exports = { sendEmail };
