/**
 * AttendSecure Admin Creation & Bootstrap Script
 * Run via: node --import tsx server/createAdmin.ts
 */

import dotenv from 'dotenv';
dotenv.config({ override: true, quiet: true });
import { db } from './db.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  console.log('\n=============================================');
  console.log('🛡️  ATTENDSECURE - CREATE SUPER ADMIN');
  console.log('=============================================\n');

  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'smartattendance13@gmail.com';
  const name = process.argv[3] || 'Super Administrator';
  const password = process.argv[4] || 'Admin@TSDC2026';

  const existing = db.getUserByEmail(email);
  if (existing) {
    console.log(`ℹ️  Admin with email "${email}" already exists in the database.`);
    console.log(`👤 Name:   ${existing.name}`);
    console.log(`📧 Email:  ${existing.email}`);
    console.log(`🛡️ Role:   ${existing.role}`);
    console.log(`⚡ Status: ${existing.status}`);
    console.log('\nTo log in, use the AttendSecure portal with role "Administrator".\n');
    return;
  }

  const userId = `usr_admin_${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const newAdmin = {
    id: userId,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    name,
    role: 'admin' as const,
    status: 'active' as const,
    created_at: now,
    updated_at: now,
  };
  db.addUser(newAdmin);

  console.log('✅ Super Admin account created successfully!\n');
  console.log('---------------------------------------------');
  console.log(`👤 Name:     ${newAdmin.name}`);
  console.log(`📧 Email:    ${newAdmin.email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`🛡️ Role:     admin`);
  console.log('---------------------------------------------');
  console.log('\nYou can now login with these credentials on the Admin Portal.\n');
}

createAdmin().catch(console.error);
