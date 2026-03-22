const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authenticateToken');
const { sendDirectNotification } = require('../notificationHelper');

// POST /api/friends/request - Send friend request
router.post('/friends/request', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'Friend ID is required' });
    if (userId === friendId) return res.status(400).json({ error: 'Cannot add yourself as friend' });

    try {
        const id = uuidv4();
        // Use a CTE to ensure we get an ID (either new or existing)
        const result = await db.query(
            `WITH ins AS (
                INSERT INTO friends (id, user_id, friend_id, status, created_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id, friend_id) DO NOTHING
                RETURNING id
            )
            SELECT id FROM ins
            UNION ALL
            SELECT id FROM friends WHERE user_id = $2 AND friend_id = $3
            LIMIT 1`,
            [id, userId, friendId, 'pending', new Date()]
        );

        const requestId = result.rows[0].id;

        // Trigger Notification
        await sendDirectNotification(
            friendId,
            'New Friend Request',
            `${req.user.name} sent you a friend request.`,
            'friend_request',
            { friendId: userId, requestId: requestId }
        );

        res.json({ success: true, requestId: requestId });
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/pending - List incoming pending requests
router.get('/friends/pending', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(
            `SELECT f.id as request_id, u.id as user_id, u.name, u.email, u.avatar, f.created_at
             FROM friends f
             JOIN users u ON f.user_id = u.id
             WHERE f.friend_id = $1 AND f.status = 'pending'`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching pending requests:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends/status/:friendId - Get relationship status with a specific user
router.get('/friends/status/:friendId', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const friendId = req.params.friendId;
    if (!friendId) return res.status(400).json({ error: 'Friend ID is required' });

    try {
        const result = await db.query(
            `SELECT status, user_id as sender_id 
             FROM friends 
             WHERE (user_id = $1 AND friend_id = $2) 
                OR (user_id = $2 AND friend_id = $1)
             LIMIT 1`,
            [userId, friendId]
        );

        if (result.rowCount === 0) {
            return res.json({ status: 'none', sender_id: null });
        }

        res.json({ 
            status: result.rows[0].status, 
            sender_id: result.rows[0].sender_id 
        });
    } catch (err) {
        console.error('Error fetching friend status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/friends - List all friends
router.get('/friends', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(
            `SELECT f.id as friendship_id, u.id, u.name, u.email, u.avatar 
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
        
        // Trigger Notification to the person who sent the request
        const friendship = result.rows[0];
        await sendDirectNotification(
            friendship.user_id,
            'Friend Request Accepted',
            `${req.user.name} accepted your friend request.`,
            'friend_accepted',
            { friendId: req.user.id }
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error accepting friend request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/friends/:id - Reject or remove friend
router.delete('/friends/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM friends WHERE id = $1 AND (user_id = $2 OR friend_id = $2)',
            [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Connection not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error removing connection:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/friends/requests/:id/accept', authenticateToken, async (req, res) => {
    console.log(`[SOCIAL] Accept hit for RequestID: ${req.params.id} by UserID: ${req.user.id}`);
    try {
        const result = await db.query(
            'UPDATE friends SET status = \'accepted\' WHERE id = $1 AND friend_id = $2 RETURNING *',
            [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) {
            console.warn(`[SOCIAL] Accept failed: No pending request found with ID ${req.params.id} for recipient ${req.user.id}`);
            return res.status(404).json({ error: 'Friend request not found' });
        }
        
        const friendship = result.rows[0];
        console.log(`[SOCIAL] Friend request ${req.params.id} accepted by ${req.user.id}`);
        await sendDirectNotification(
            friendship.user_id,
            'Friend Request Accepted',
            `${req.user.name} accepted your friend request.`,
            'friend_accepted',
            { friendId: req.user.id }
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[SOCIAL] Error accepting friend request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/friends/requests/:id/reject', authenticateToken, async (req, res) => {
    console.log(`[SOCIAL] Reject hit for RequestID: ${req.params.id} by UserID: ${req.user.id}`);
    try {
        const result = await db.query(
            'DELETE FROM friends WHERE id = $1 AND (user_id = $2 OR friend_id = $2)',
            [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) {
            console.warn(`[SOCIAL] Reject failed: No connection found with ID ${req.params.id}`);
            return res.status(404).json({ error: 'Connection not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[SOCIAL] Error removing connection:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
