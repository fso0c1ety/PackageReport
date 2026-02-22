// Simple file-based database for tables and tasks
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'server', 'data');
const tablesFile = path.join(dataDir, 'tables.json');
const tasksFile = path.join(dataDir, 'tasks.json');

export function readTables() {
  try {
    if (!fs.existsSync(tablesFile)) return [];
    return JSON.parse(fs.readFileSync(tablesFile, 'utf-8'));
  } catch (err) {
    console.error('Error reading tables:', err);
    return [];
  }
}

export function writeTables(tables) {
  try {
    fs.writeFileSync(tablesFile, JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error('Error writing tables:', err);
  }
}

export function readTasks() {
  try {
    if (!fs.existsSync(tasksFile)) return [];
    return JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
  } catch (err) {
    console.error('Error reading tasks:', err);
    return [];
  }
}

export function writeTasks(tasks) {
  try {
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error('Error writing tasks:', err);
  }
}
