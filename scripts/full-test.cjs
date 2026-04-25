#!/usr/bin/env node
const BASE = 'http://localhost:3000';
let token = '';
let adminToken = '';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

async function run() {
  // Wait for server
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(BASE); if (r.ok) break; } catch {}
    await wait(500);
  }
  console.log('Server ready');

  // Seed
  await api('POST', '/api/seed');
  await wait(300);

  // Login client
  let r = await api('POST', '/api/auth', { email: 'test@customer.com', password: 'test123', portal: 'nxl' });
  token = r.data?.token || '';
  console.log(`1. Client Login: ${r.status} - ${r.data?.user?.name || r.error}`);

  // Login admin
  r = await api('POST', '/api/auth', { email: 'info.vsualdm@gmail.com', password: 'VSUAL@NX$260&', portal: 'vbos' });
  adminToken = r.data?.token || '';
  console.log(`2. Admin Login: ${r.status} - Role: ${r.data?.user?.role || r.error}`);
  await wait(300);

  // Bad password
  r = await api('POST', '/api/auth', { email: 'test@customer.com', password: 'wrong', portal: 'nxl' });
  console.log(`3. Bad Password: ${r.status} - ${r.data?.error || 'OK'}`);

  // Dashboard
  r = await api('GET', '/api/dashboard');
  const d = r.data;
  console.log(`4. Dashboard: ${r.status} - ${Object.keys(d?.leads?.byStage || {}).length} stages, ${d?.hotLeads?.length || 0} hot, ${d?.recentActivities?.length || 0} activities`);

  // Leads
  r = await api('GET', '/api/leads?limit=5');
  console.log(`5. Leads List: ${r.status} - ${r.data?.leads?.length || 0} leads (total: ${r.data?.pagination?.total || '?'})`);

  // Leads filter
  r = await api('GET', '/api/leads?stage=Hot%20Lead');
  console.log(`6. Leads Filter: ${r.status} - ${r.data?.leads?.length || 0} hot leads`);

  // Leads search
  r = await api('GET', '/api/leads?search=Marcus');
  console.log(`7. Leads Search: ${r.status} - ${r.data?.leads?.length || 0} results`);

  // Lead detail
  r = await api('GET', '/api/leads?limit=1');
  if (r.data?.leads?.[0]?.id) {
    const lid = r.data.leads[0].id;
    r = await api('GET', `/api/leads/${lid}`);
    console.log(`8. Lead Detail: ${r.status} - ${r.data?.lead?.name || '?'}`);
  } else console.log('8. Lead Detail: SKIP');

  // Tasks
  r = await api('GET', '/api/tasks?limit=5');
  console.log(`9. Tasks: ${r.status} - ${r.data?.tasks?.length || 0} tasks (total: ${r.data?.pagination?.total || '?'})`);

  // Projects
  r = await api('GET', '/api/projects');
  const projs = r.data?.projects || [];
  console.log(`10. Projects: ${r.status} - ${projs.length} projects`);
  for (const p of projs.slice(0, 3)) {
    const done = (p.steps || []).filter(s => s.status === 'completed').length;
    console.log(`     ${p.clientName}: ${done}/${(p.steps || []).length} steps, phase=${p.currentPhase}`);
  }

  // Activities
  r = await api('GET', '/api/activities?limit=5');
  console.log(`11. Activities: ${r.status} - ${r.data?.activities?.length || 0} activities`);

  // Notifications
  r = await api('GET', '/api/notifications');
  console.log(`12. Notifications: ${r.status} - ${r.data?.notifications?.length || 0} total, ${r.data?.unreadCount || 0} unread`);

  // Settings
  r = await api('GET', '/api/settings');
  console.log(`13. Settings: ${r.status} - ${r.data?.allSettings?.length || 0} settings`);

  // Automations
  r = await api('GET', '/api/automations');
  console.log(`14. Automations: ${r.status} - ${r.data?.rules?.length || 0} rules`);

  // Users (admin)
  const savedToken = token;
  token = adminToken;
  r = await api('GET', '/api/users');
  token = savedToken;
  console.log(`15. Users (Admin): ${r.status} - ${r.data?.users?.length || 0} users`);
  for (const u of (r.data?.users || []).slice(0, 5)) {
    console.log(`     ${u.name} (${u.email}) - ${u.role}/${u.portal}`);
  }

  // Users (client - should 401)
  r = await api('GET', '/api/users');
  console.log(`16. Users (Client): ${r.status} - ${r.status === 401 ? 'Expected 401' : 'BUG!'}`);

  // Create lead
  r = await api('POST', '/api/leads', { name: 'Recheck Lead', phone: '555-0000', email: 'recheck@test.com', businessName: 'Recheck Corp' });
  const newLeadId = r.data?.lead?.id || '';
  console.log(`17. Create Lead: ${r.status} - ${r.data?.lead?.name || r.error}`);

  // Update lead
  if (newLeadId) {
    r = await api('PATCH', '/api/leads', { id: newLeadId, pipelineStage: 'Engaged' });
    console.log(`18. Update Lead: ${r.status} - ${r.data?.lead?.pipelineStage || '?'}`);
  } else console.log('18. Update Lead: SKIP');

  // Archive lead
  if (newLeadId) {
    r = await api('DELETE', `/api/leads?id=${newLeadId}`);
    console.log(`19. Archive Lead: ${r.status} - ${r.data?.message || '?'}`);
  } else console.log('19. Archive Lead: SKIP');

  // Webhook
  r = await api('POST', '/api/webhook', { first_name: 'Webhook', last_name: 'Test', email: 'wh@test.com', phone: '555-1234', source: 'ghl_webhook' });
  console.log(`20. Webhook: ${r.status} - ${r.data?.lead?.name || r.error} (${r.data?.lead?.source || ''})`);

  // Page HTML check
  try {
    const res = await fetch(BASE);
    const html = await res.text();
    const hasTitle = html.includes('<title>') && html.includes('Command Center');
    const hasBody = html.includes('<body');
    const hasJS = html.includes('_next/static');
    const hasCSS = html.includes('stylesheet');
    console.log(`21. Page HTML: title=${hasTitle} body=${hasBody} JS=${hasJS} CSS=${hasCSS}`);
  } catch (e) {
    console.log(`21. Page HTML: ERROR - ${e.message}`);
  }

  console.log('\n=== DONE ===');
}

run();
