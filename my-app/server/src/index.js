import express from 'express';
import cors from 'cors';
import db from './db.js';
import nodemailer from 'nodemailer';
// Configure nodemailer transporter (using Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'valonhalili74@gmail.com', // sender address
    pass: 'Kukupermu12345', // use an app password, not your main password
  },
});

async function sendStatusEmail(report) {
  const mailOptions = {
    from: 'valonhalili74@gmail.com',
    to: 'valonhalili74@gmail.com',
    subject: `Porosia ${report.importusi} eshte ${report.status}`,
    text: `Pershendetje Valon,\n\nPorosia me ID: ${report.id} ka ndryshuar statusin në: ${report.status}\n\nDetajet:\nEksportusi: ${report.eksportusi}\nImportusi: ${report.importusi}\nKG: ${report.kg}\nData/Ora: ${report.dataOra}\nProdukti: ${report.produkti}`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log('Status email sent');
  } catch (e) {
    console.error('Failed to send email:', e);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function nowString() {
  try {
    return new Date().toLocaleString();
  } catch (e) {
    return String(Date.now());
  }
}

// Routes
app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/reports', async (req, res) => {
  const rows = await db.list();
  res.json(rows);
});

app.post('/reports', async (req, res) => {
  const { eksportusi = '', importusi = '', kg = '', dataOra = '', produkti = '', status = 'Ngarkuar' } = req.body || {};
  const id = Date.now().toString();
  const ts = nowString();
  const payload = {
    id,
    eksportusi,
    importusi,
    kg,
    dataOra: dataOra?.length ? dataOra : ts,
    produkti,
    status,
    created_at: ts,
    updated_at: ts,
  };
  await db.insert(payload);
  const saved = await db.get(id);
  res.status(201).json(saved);
});

app.patch('/reports/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await db.get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { eksportusi, importusi, kg, dataOra, produkti, status } = req.body || {};
  const ts = nowString();
  const next = {
    id,
    eksportusi: eksportusi ?? existing.eksportusi,
    importusi: importusi ?? existing.importusi,
    kg: kg ?? existing.kg,
    // If status changes, update dataOra to current time unless explicitly provided
    dataOra: dataOra ?? (status && status !== existing.status ? ts : existing.dataOra),
    produkti: produkti ?? existing.produkti,
    status: status ?? existing.status,
    updated_at: ts,
  };
  const saved = await db.update(id, next);

  // Send email if status changed to any value
  if (status && status !== existing.status) {
    sendStatusEmail({ ...existing, ...next });
  }

  res.json(saved);
});

app.delete('/reports/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await db.get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await db.remove(id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
