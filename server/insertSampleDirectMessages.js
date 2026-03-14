const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// Sample users from people.json
const users = [
  { id: '2d9c3bf2-8d0d-4549-a831-2bc8ef8c149c', name: 'Toni' },
  { id: 'user-valon-12345', name: 'valon halili' },
  { id: '7967fda3-71e9-4f85-a83a-1c1a4446b261', name: 'Valon Halili' },
  { id: 'e0aae799-f930-4663-b2d3-6c999aadb4f6', name: 'Valoni' },
  { id: '180ed84e-6fd9-43a0-918b-d76b2a2820e2', name: 'Valonii' },
  { id: 'b27a3eb9-4691-40ad-bd15-479367ced28a', name: 'Valonii' },
  { id: '29c55cf4-4e5d-4874-b6a6-f61f8e74165d', name: 'valon halili' }
];

async function insertSampleMessages() {
  const messages = [
    {
      sender_id: users[0].id,
      recipient_id: users[1].id,
      text: 'Hello Valon!',
      timestamp: Date.now() - 100000,
      unread: true
    },
    {
      sender_id: users[1].id,
      recipient_id: users[0].id,
      text: 'Hi Toni, how are you?',
      timestamp: Date.now() - 90000,
      unread: false
    },
    {
      sender_id: users[2].id,
      recipient_id: users[3].id,
      text: 'Hey Valoni!',
      timestamp: Date.now() - 80000,
      unread: true
    },
    {
      sender_id: users[3].id,
      recipient_id: users[2].id,
      text: 'Hello Valon Halili!',
      timestamp: Date.now() - 70000,
      unread: false
    },
    {
      sender_id: users[4].id,
      recipient_id: users[5].id,
      text: 'Hi Valonii!',
      timestamp: Date.now() - 60000,
      unread: true
    },
    {
      sender_id: users[5].id,
      recipient_id: users[4].id,
      text: 'Hello!',
      timestamp: Date.now() - 50000,
      unread: false
    },
    {
      sender_id: users[6].id,
      recipient_id: users[1].id,
      text: 'Hey, what’s up?',
      timestamp: Date.now() - 40000,
      unread: true
    }
  ];

  for (const msg of messages) {
    await db.query(
      'INSERT INTO direct_messages (id, sender_id, recipient_id, text, timestamp, unread) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), msg.sender_id, msg.recipient_id, msg.text, msg.timestamp, msg.unread]
    );
  }
  console.log('Sample direct messages inserted.');
  db.pool.end();
}

insertSampleMessages();
