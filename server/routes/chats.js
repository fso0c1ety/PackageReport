const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authenticateToken');
const { sendPushNotification } = require('../firebase');

router.get('/calls/ice-config', authenticateToken, (req, res) => {
    const iceServers = [
        { urls: process.env.NEXT_PUBLIC_STUN_URL || 'stun:stun.l.google.com:19302' }
    ];

    if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
        iceServers.push({
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_CREDENTIAL
        });
    }

    res.json({ iceServers });
});

// GET /api/chats - Get all distinct conversations for current user
router.get('/chats', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    try {
        const result = await db.query(
            `WITH last_messages AS (
                SELECT 
                    CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as other_user_id,
                    text,
                    timestamp,
                    ROW_NUMBER() OVER(PARTITION BY CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END ORDER BY timestamp DESC) as rn
                FROM direct_messages
                WHERE sender_id = $1 OR recipient_id = $1
            )
            SELECT u.id, u.name, u.email, u.avatar, lm.text as last_message, lm.timestamp
            FROM last_messages lm
            JOIN users u ON u.id = lm.other_user_id
            WHERE lm.rn = 1
            ORDER BY lm.timestamp DESC`,
            [myId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chats/:userId - Get conversation history
router.get('/chats/:userId', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    const otherId = req.params.userId;

    try {
        const result = await db.query(
            `SELECT * FROM direct_messages 
       WHERE (sender_id = $1 AND recipient_id = $2) 
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY timestamp ASC`,
            [myId, otherId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching chat messages:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/chats/:userId - Send a direct message
router.post('/chats/:userId', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    const otherId = req.params.userId;
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: 'Message text is required' });
    if (myId === otherId) return res.status(400).json({ error: 'You cannot message yourself' });

    try {
        const newMessage = {
            id: uuidv4(),
            sender_id: myId,
            recipient_id: otherId,
            text: text,
            timestamp: new Date(),
            read: false
        };

        await db.query(
            'INSERT INTO direct_messages (id, sender_id, recipient_id, text, timestamp, read) VALUES ($1, $2, $3, $4, $5, $6)',
            [newMessage.id, newMessage.sender_id, newMessage.recipient_id, newMessage.text, newMessage.timestamp, newMessage.read]
        );

        try {
            // Notification delivery must never turn a successfully saved message into a 500.
            const notifId = uuidv4();
            await db.query(
                'INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                [notifId, newMessage.recipient_id, newMessage.sender_id, 'direct_message', JSON.stringify({ text: newMessage.text }), false]
            );

            const recipientRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [otherId]);
            const senderRes = await db.query('SELECT name FROM users WHERE id = $1', [myId]);
            const token = recipientRes.rows[0]?.fcm_token;
            const senderName = senderRes.rows[0]?.name || 'Someone';

            if (token) {
                await sendPushNotification(
                    [token],
                    'New Message',
                    `${senderName}: ${newMessage.text}`,
                    { type: 'direct_message', senderId: myId }
                );
            }
        } catch (notificationError) {
            console.error('Message saved, but notification delivery failed:', notificationError);
        }

        res.json(newMessage);
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/chats/:userId/call-notification - Trigger push notification for incoming calls
router.post('/chats/:userId/call-notification', authenticateToken, async (req, res) => {
    const { sendDirectNotification } = require('../notificationHelper');
    const myId = req.user.id;
    const otherId = req.params.userId;
    const { callerName, callerAvatar, isVideo, offer, callId, sentAt } = req.body;

    try {
        await sendDirectNotification(
            otherId,
            'Incoming Call',
            `${callerName || 'Someone'} is calling you via ${isVideo ? 'Video' : 'Audio'}.`,
            'incoming_call',
            {
                callerId: myId,
                callerName: callerName,
                callerAvatar: callerAvatar,
                isVideo: isVideo,
                offer: offer || null,
                callId: callId || null,
                sentAt: sentAt || Date.now()
            }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error triggering call push notification:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
