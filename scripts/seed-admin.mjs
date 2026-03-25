// One-time bootstrap script — creates first Admin employee with a token
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0832796952",
  appId: "1:726645544810:web:2c9d310e90436a1224f713",
  apiKey: "AIzaSyAeiwBE7Fd4hdqIpUkxyGx9MxCAsYF-WV8",
  authDomain: "gen-lang-client-0832796952.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-185ac016-c683-4029-9677-bf7ab0064674",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(20);
  globalThis.crypto.getRandomValues(array);
  const raw = Array.from(array).map(b => chars[b % chars.length]).join('');
  return `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}`;
}

const employeeId = '9000-001';
const firstName  = 'Admin';
const lastName   = 'DevOne';
const role       = 'Admin';

// Check if already exists
const q = query(collection(db, 'employees'), where('employeeId', '==', employeeId));
const existing = await getDocs(q);
if (!existing.empty) {
  console.log(`Employee ${employeeId} already exists. Exiting.`);
  process.exit(0);
}

const token = generateToken();
const now = new Date();
const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days

const docRef = await addDoc(collection(db, 'employees'), {
  employeeId,
  firstName,
  lastName,
  role,
  isActive: true,
  deactivationTagged: false,
  deactivationTaggedBy: null,
  token,
  tokenIssuedAt: now.toISOString(),
  tokenExpiresAt: expires.toISOString(),
  tokenIssuedBy: 'system-bootstrap',
  createdAt: now.toISOString(),
  createdBy: 'system-bootstrap',
});

console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║         SPARK v3 — Admin Bootstrap               ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║  Employee #:  ${employeeId.padEnd(35)}║`);
console.log(`║  Name:        ${(firstName + ' ' + lastName).padEnd(35)}║`);
console.log(`║  Role:        ${role.padEnd(35)}║`);
console.log(`║  Token:       ${token.padEnd(35)}║`);
console.log(`║  Expires:     ${expires.toDateString().padEnd(35)}║`);
console.log(`║  Doc ID:      ${docRef.id.padEnd(35)}║`);
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('Save this token — it will not be shown again.');
console.log('');

process.exit(0);
