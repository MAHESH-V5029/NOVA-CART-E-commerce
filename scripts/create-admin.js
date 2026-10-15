require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function main() {
  const name = (process.env.ADMIN_NAME || 'Store Admin').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid email in your .env file.');
  }
  if (password.length < 8 || password === 'ChangeMe123!') {
    throw new Error('Set ADMIN_PASSWORD to your own password of at least 8 characters in .env (do not use the example password).');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'admin'`,
    [name, email, passwordHash]
  );
  console.log(`Admin account is ready for ${email}.`);
}

main().catch((error) => {
  console.error('Could not create the admin account:', error.message);
  process.exitCode = 1;
}).finally(async () => { await pool.end(); });
