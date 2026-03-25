// Bootstrap first Admin via Firestore REST API (no auth required with open rules)
const PROJECT_ID = 'gen-lang-client-0832796952';
const DATABASE_ID = 'ai-studio-185ac016-c683-4029-9677-bf7ab0064674';
const API_KEY = 'AIzaSyAeiwBE7Fd4hdqIpUkxyGx9MxCAsYF-WV8';

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(20);
  globalThis.crypto.getRandomValues(array);
  const raw = Array.from(array).map(b => chars[b % chars.length]).join('');
  return `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}`;
}

// Check if employee already exists
const checkUrl = `${BASE_URL}/employees?key=${API_KEY}&pageSize=10`;
const checkRes = await fetch(checkUrl);
const checkData = await checkRes.json();

if (checkData.documents?.some(d => d.fields?.employeeId?.stringValue === '9000-001')) {
  console.log('Employee 9000-001 already exists. Exiting.');
  process.exit(0);
}

const token = generateToken();
const now = new Date();
const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

const body = {
  fields: {
    employeeId:          { stringValue: '9000-001' },
    firstName:           { stringValue: 'Admin' },
    lastName:            { stringValue: 'DevOne' },
    role:                { stringValue: 'Admin' },
    isActive:            { booleanValue: true },
    deactivationTagged:  { booleanValue: false },
    deactivationTaggedBy:{ nullValue: null },
    token:               { stringValue: token },
    tokenIssuedAt:       { stringValue: now.toISOString() },
    tokenExpiresAt:      { stringValue: expires.toISOString() },
    tokenIssuedBy:       { stringValue: 'system-bootstrap' },
    createdAt:           { stringValue: now.toISOString() },
    createdBy:           { stringValue: 'system-bootstrap' },
  }
};

const res = await fetch(`${BASE_URL}/employees?key=${API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const err = await res.text();
  console.error('Failed:', err);
  process.exit(1);
}

const created = await res.json();
const docId = created.name?.split('/').pop();

console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║         SPARK v3 — Admin Bootstrap               ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║  Employee #:  ${'9000-001'.padEnd(35)}║`);
console.log(`║  Name:        ${'Admin DevOne'.padEnd(35)}║`);
console.log(`║  Role:        ${'Admin'.padEnd(35)}║`);
console.log(`║  Token:       ${token.padEnd(35)}║`);
console.log(`║  Expires:     ${expires.toDateString().padEnd(35)}║`);
console.log(`║  Doc ID:      ${(docId || '').padEnd(35)}║`);
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('Save this token — it will not be shown again.');
console.log('');

process.exit(0);
