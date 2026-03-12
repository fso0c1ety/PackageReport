const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authenticateToken');

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

    try {
        const newMessage = {
            id: uuidv4(),
            sender_id: myId,
            recipient_id: otherId,
            text: text,
            timestamp: Date.now()
        };

        await db.query(
            'INSERT INTO direct_messages (id, sender_id, recipient_id, text, timestamp) VALUES ($1, $2, $3, $4, $5)',
            [newMessage.id, newMessage.sender_id, newMessage.recipient_id, newMessage.text, newMessage.timestamp]
        );

        res.json(newMessage);
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
