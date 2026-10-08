#!/usr/bin/env node
/**
 * Create an administrator account.
 *
 * Usage:
 *   npm run create-admin -- you@example.com "TemporaryPass123!"
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env (server-side only).
 * Creates the auth user (email confirmation auto-approved) and promotes the
 * matching `profiles` row to role = 'admin'.
 *
 * Never run this against production with a weak password — the service-role
 * key bypasses RLS, so treat it like a production credential.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [email, password] = process.argv.slice(2);

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  fail('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('Provide a valid email, e.g.  npm run create-admin -- you@example.com "Password123!"');
}
if (!password || password.length < 8) {
  fail('Provide a password of at least 8 characters.');
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: email.split('@')[0] },
});

if (error) {
  fail(`Could not create user: ${error.message}`);
}

const { data: profile, error: profileError } = await admin
  .from('profiles')
  .update({ role: 'admin' })
  .eq('id', data.user.id)
  .select('id, email, role')
  .single();

if (profileError) {
  fail(`User created, but role promotion failed: ${profileError.message}`);
}

console.log(`\n✔ Administrator ready:`);
console.log(`   email: ${profile.email}`);
console.log(`   role : ${profile.role}`);
console.log(`   id   : ${profile.id}`);
console.log(`\nSign in at /admin/login`);
