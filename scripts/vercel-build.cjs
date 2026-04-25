// ═══════════════════════════════════════════════════════════
// Vercel Build Helper — Auto-switches Prisma schema provider
// for Vercel (PostgreSQL) vs local (SQLite)
// ═══════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// Check if we're on Vercel (DATABASE_URL contains postgresql)
const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.includes('postgresql') || dbUrl.includes('postgres') || process.env.VERCEL) {
  // Vercel environment — switch to PostgreSQL
  schema = schema.replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"'
  );
  console.log('Switched Prisma provider to PostgreSQL (Vercel detected)');
} else {
  console.log('Using SQLite provider (local development)');
}

fs.writeFileSync(schemaPath, schema, 'utf-8');
