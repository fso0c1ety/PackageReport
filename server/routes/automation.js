const express = require('express');
const router = express.Router();
const db = require('../db');

// Save/Update automation for a table or task
router.post('/automation/:tableId', async (req, res) => {
  const { triggerCol, cols, recipients, enabled, taskId } = req.body;
  const tableId = req.params.tableId;

  try {
    if (taskId) {
      await db.query(`
        INSERT INTO automations (table_id, task_id, trigger_col, enabled, recipients, cols)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (table_id, task_id) WHERE task_id IS NOT NULL DO UPDATE SET
          trigger_col = $3, enabled = $4, recipients = $5, cols = $6
      `, [tableId, taskId, triggerCol, enabled, JSON.stringify(recipients), JSON.stringify(cols)]);
    } else {
      await db.query(`
        INSERT INTO automations (table_id, task_id, trigger_col, enabled, recipients, cols)
        VALUES ($1, NULL, $2, $3, $4, $5)
        ON CONFLICT (table_id) WHERE task_id IS NULL DO UPDATE SET
          trigger_col = $2, enabled = $3, recipients = $4, cols = $5
      `, [tableId, triggerCol, enabled, JSON.stringify(recipients), JSON.stringify(cols)]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving automation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all automation configs for a table (including per-task)
router.get('/automation/:tableId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM automations WHERE table_id = $1', [req.params.tableId]);
    // Map snake_case to camelCase for frontend
    const mapped = result.rows.map(row => ({
      id: row.id,
      tableId: row.table_id,
      taskId: row.task_id,
      triggerCol: row.trigger_col,
      enabled: row.enabled,
      recipients: row.recipients,
      cols: row.cols
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Error fetching automations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
