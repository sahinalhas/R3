import Database from 'better-sqlite3';
import { join } from 'path';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  const dataDir = join(process.cwd(), 'data');
  const dbPath = join(dataDir, 'rehberlik.db');
  
  console.log(`Opening database at ${dbPath}`);
  const db = new Database(dbPath);
  
  // Check if admin user already exists
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  
  if (existingUser) {
    console.log('Admin user already exists!');
    db.close();
    return;
  }
  
  // Create admin user
  const hashedPassword = await hashPassword('admin123');
  
  db.prepare(
    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)'
  ).run('admin', hashedPassword, 'Admin User', 'admin');
  
  console.log('Admin user created successfully!');
  console.log('Username: admin');
  console.log('Password: admin123');
  
  db.close();
}

main().catch(err => {
  console.error('Error creating admin user:', err);
  process.exit(1);
});
