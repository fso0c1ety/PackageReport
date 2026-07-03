const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function mapAutomationRow(row) {
  return {
    id: row.id,
    tableId: row.table_id,
    taskIds: row.task_ids || (row.task_id ? [row.task_id] : []),
    triggerCol: row.trigger_col,
    enabled: row.enabled,
    recipients: row.recipients,
    cols: row.cols,
    actionType: row.action_type || 'email',
    rules: Array.isArray(row.conditions) ? row.conditions : [],
  };
}

function validateAutomationPayload({ triggerCol, recipients, cols }) {
  if (!triggerCol) {
    return 'Trigger column is required';
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return 'At least one recipient email is required';
  }
  if (!Array.isArray(cols) || cols.length === 0) {
    return 'At least one board column must be included in the email';
  }
  return null;
}

const toJsonArray = (value) => JSON.stringify(Array.isArray(value) ? value : []);

// Save/Update automation for a table or task
router.post('/automation/:tableId', async (req, res) => {
  const { id, triggerCol, cols, recipients, enabled, taskIds, actionType, rules } = req.body;
  const normalizedRules = Array.isArray(rules)
    ? rules.filter((rule) => rule?.value && ['email', 'notification', 'both'].includes(rule?.actionType))
    : [];
  const tableId = req.params.tableId;
  const validationError = validateAutomationPayload({ triggerCol, recipients, cols });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    if (id) {
      await db.query(`
        UPDATE automations 
        SET trigger_col = $1, enabled = $2, recipients = $3, cols = $4, action_type = $5,
            task_ids = $6, conditions = $7, actions = $8, updated_at = NOW()
        WHERE id = $9 AND table_id = $10
      `, [triggerCol, enabled, toJsonArray(recipients), toJsonArray(cols), actionType || 'email', toJsonArray(taskIds),
        JSON.stringify(normalizedRules), JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type }))),
        id, tableId]);
    } else {
      await db.query(`
        INSERT INTO automations
          (id, table_id, task_ids, trigger_col, enabled, recipients, cols, action_type, conditions, actions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [uuidv4(), tableId, toJsonArray(taskIds), triggerCol, enabled, toJsonArray(recipients), toJsonArray(cols), actionType || 'email',
        JSON.stringify(normalizedRules), JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type })))]);
    }

    const result = await db.query('SELECT * FROM automations WHERE table_id = $1 ORDER BY id DESC', [tableId]);
    res.json(result.rows.map(mapAutomationRow));
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
    res.json(result.rows.map(mapAutomationRow));
  } catch (err) {
    console.error('Error fetching automations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
