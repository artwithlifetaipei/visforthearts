const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
  console.log('--- Fetching PostgREST Schema ---');
  const url = `${supabaseUrl}/rest/v1/`;
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  });
  const schema = await response.json();
  console.log('Schema keys:', Object.keys(schema));
  if (schema.definitions) {
    console.log('Available definitions:', Object.keys(schema.definitions));
  } else if (schema.paths) {
    console.log('Available paths:', Object.keys(schema.paths));
  } else {
    console.log('Schema content preview:', JSON.stringify(schema).substring(0, 500));
  }
}

check().catch(console.error);
