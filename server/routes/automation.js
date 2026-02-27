const express = require('express');
const router = express.Router();
const db = require('../db');

// Save/Update automation for a table or task
router.post('/automation/:tableId', async (req, res) => {
  const { triggerCol, cols, recipients, enabled, taskId } = req.body;
  const tableId = req.params.tableId;

  try {
    if (taskId) {
      // Upsert per-task automation config
      await db.query(`
        INSERT INTO automations (table_id, task_id, trigger_col, enabled, recipients, cols)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (table_id, task_id) DO UPDATE SET
          trigger_col = $3, enabled = $4, recipients = $5, cols = $6
      `, [tableId, taskId, triggerCol, enabled, JSON.stringify(recipients), JSON.stringify(cols)]);
    } else {
      // Upsert table-level automation config
      // Note: We need a unique constraint or manual check for (table_id) WHERE task_id IS NULL if we want ON CONFLICT
      // For simplicity, let's delete and insert if not using a complex unique index
      await db.query('DELETE FROM automations WHERE table_id = $1 AND task_id IS NULL', [tableId]);
      await db.query(`
        INSERT INTO automations (table_id, task_id, trigger_col, enabled, recipients, cols)
        VALUES ($1, NULL, $2, $3, $4, $5)
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
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching automations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
