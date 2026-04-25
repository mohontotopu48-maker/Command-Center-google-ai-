#!/usr/bin/env node
// Pre-warm all API routes by hitting them sequentially
const BASE = 'http://localhost:3000';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function warmup() {
  console.log('Warming up API routes...');
  
  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) { console.log('Server ready'); break; }
    } catch {}
    await wait(1000);
  }

  // Seed database (login as admin first)
  try {
    const adminLogin = await fetch(`${BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'info.vsualdm@gmail.com', password: 'VSUAL@NX$260&', portal: 'vbos' }),
    });
    const adminData = await adminLogin.json();
    const adminToken = adminData.token;
    
    const seedRes = await fetch(`${BASE}/api/seed`, { 
      method: 'POST',
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    });
    const seedData = await seedRes.json();
    console.log('Seed:', seedData.message || seedData.error);
  } catch (e) { console.log('Seed skipped:', e.message); }

  // Login to get token
  let token = '';
  try {
    const loginRes = await fetch(`${BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@customer.com', password: 'test123', portal: 'nxl' }),
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log('Login OK, token:', token ? 'yes' : 'no');
  } catch (e) { console.log('Login failed:', e.message); return; }

  const headers = { Authorization: `Bearer ${token}` };
  
  // Hit routes one by one to trigger Turbopack compilation
  const routes = [
    { path: '/api/dashboard', label: 'Dashboard' },
    { path: '/api/leads?limit=5', label: 'Leads' },
    { path: '/api/tasks?limit=5', label: 'Tasks' },
    { path: '/api/projects', label: 'Projects' },
    { path: '/api/activities?limit=5', label: 'Activities' },
    { path: '/api/notifications', label: 'Notifications' },
    { path: '/api/settings', label: 'Settings' },
    { path: '/api/users', label: 'Users' },
    { path: '/api/automations', label: 'Automations' },
  ];

  for (const route of routes) {
    try {
      const res = await fetch(`${BASE}${route.path}`, { headers });
      console.log(`${route.label}: ${res.status} ${res.ok ? 'OK' : 'FAIL'}`);
      if (res.ok) await res.text(); // consume body
      await wait(500); // small delay between compilations
    } catch (e) {
      console.log(`${route.label}: ERROR - ${e.message}`);
    }
  }

  console.log('Warmup complete!');
}

warmup();
