const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'valonhalili74@gmail.com',
        pass: 'aoyojljhvpwhrswg',
    },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,
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
