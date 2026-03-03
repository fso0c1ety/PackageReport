const express = require('express');
const router = express.Router();
const db = require('../db');

// Save/Update automation for a table or task
router.post('/automation/:tableId', async (req, res) => {
  const { id, triggerCol, cols, recipients, enabled, taskId, actionType } = req.body;
  const tableId = req.params.tableId;

  try {
    if (id) {
      // Update existing automation
      await db.query(`
        UPDATE automations 
        SET trigger_col = $1, enabled = $2, recipients = $3, cols = $4, action_type = $5, task_id = $6
        WHERE id = $7 AND table_id = $8
      `, [triggerCol, enabled, JSON.stringify(recipients), JSON.stringify(cols), actionType || 'email', taskId || null, id, tableId]);
    } else {
      // Create new automation
      await db.query(`
        INSERT INTO automations (table_id, task_id, trigger_col, enabled, recipients, cols, action_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [tableId, taskId || null, triggerCol, enabled, JSON.stringify(recipients), JSON.stringify(cols), actionType || 'email']);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving automation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete automation
router.delete('/automation/:tableId/:id', async (req, res) => {
  const { tableId, id } = req.params;
  try {
    await db.query('DELETE FROM automations WHERE id = $1 AND table_id = $2', [id, tableId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting automation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all automation configs for a table (including per-task)
router.get('/automation/:tableId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM automations WHERE table_id = $1 ORDER BY id DESC', [req.params.tableId]);
    // Map snake_case to camelCase for frontend
    const mapped = result.rows.map(row => ({
      id: row.id,
      tableId: row.table_id,
      taskId: row.task_id,
      triggerCol: row.trigger_col,
      enabled: row.enabled,
      recipients: row.recipients,
      cols: row.cols,
      actionType: row.action_type || 'email'
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Error fetching automations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
