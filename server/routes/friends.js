const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authenticateToken');

// POST /api/friends/request - Send a friend request
router.post('/friends/request', authenticateToken, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    if (!friendId) return res.status(400).json({ error: 'friendId is required' });
    if (friendId === userId) return res.status(400).json({ error: 'You cannot add yourself as a friend' });

    try {
        // Check if already friends or request pending
        const existing = await db.query(
            'SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
            [userId, friendId]
        );

        if (existing.rowCount > 0) {
            return res.status(400).json({ error: 'Friendship or request already exists' });
        }

        await db.query(
            'INSERT INTO friends (id, user_id, friend_id, status) VALUES ($1, $2, $3, $4)',
            [uuidv4(), userId, friendId, 'pending']
        );

        // Create notification for the friend
        await db.query(
            'INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), friendId, userId, 'friend_request', JSON.stringify({ senderName: req.user.name })]
        );

        res.json({ success: true, message: 'Friend request sent' });
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends - List confirmed friends
router.get('/friends', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(
            `SELECT u.id, u.name, u.email, u.avatar 
       FROM users u
       JOIN friends f ON (f.user_id = u.id OR f.friend_id = u.id)
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND u.id != $1 AND f.status = 'accepted'`,
            [userId]
        );

        const friendsWithAvatars = result.rows.map(user => ({
            ...user,
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`
        }));

        res.json(friendsWithAvatars);
    } catch (err) {
        console.error('Error fetching friends:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/friends/accept - Accept a friend request
router.post('/friends/accept', authenticateToken, async (req, res) => {
    const { senderId } = req.body;
    const userId = req.user.id;

    try {
        const result = await db.query(
            "UPDATE friends SET status = 'accepted' WHERE user_id = $1 AND friend_id = $2 AND status = 'pending' RETURNING *",
            [senderId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        res.json({ success: true, message: 'Friend request accepted' });
    } catch (err) {
        console.error('Error accepting friend request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
