const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authenticateToken');

// POST /api/friends/request - Send friend request
router.post('/friends/request', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'Friend ID is required' });
    if (userId === friendId) return res.status(400).json({ error: 'Cannot add yourself as friend' });

    try {
        const id = uuidv4();
        await db.query(
            'INSERT INTO friends (id, user_id, friend_id, status, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, friend_id) DO NOTHING',
            [id, userId, friendId, 'pending', new Date()]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends - List all friends
router.get('/friends', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(
            `SELECT f.*, u.name, u.email, u.avatar 
             FROM friends f
             JOIN users u ON (f.friend_id = u.id AND f.user_id = $1) OR (f.user_id = u.id AND f.friend_id = $1)
             WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching friends:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/friends/:id/accept - Accept friend request
router.put('/friends/:id/accept', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE friends SET status = \'accepted\' WHERE id = $1 AND friend_id = $2 RETURNING *',
            [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Friend request not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error accepting friend request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
