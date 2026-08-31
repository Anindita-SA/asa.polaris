import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const AUDIT_LOG_PATH = path.join(PROJECT_ROOT, 'scripts/logs/audit.jsonl');
const LOCK_FILE_PATH = path.join(PROJECT_ROOT, '.user_id_lock');

// STRICT ALLOWLIST
const ALLOWED_TABLES = [
  'profiles',
  'hardware_opportunities',
  'morning_briefs',
  'tasks',
  'goals',
  'eulogies',
  'milestones'
];

function logAudit(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  fs.appendFileSync(AUDIT_LOG_PATH, line, 'utf8');
}

export async function createSafeClient(scriptName, readMostly = false, isDryRun = false) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or URL');
  }

  const rawClient = createClient(url, key, { auth: { persistSession: false } });

  // Resolve and lock user_id
  const { data } = await rawClient.from('profiles').select('id').limit(1);
  const uid = data?.[0]?.id;
  if (!uid) throw new Error('Could not resolve a user_id from profiles.');

  if (fs.existsSync(LOCK_FILE_PATH)) {
    const lockedUid = fs.readFileSync(LOCK_FILE_PATH, 'utf8').trim();
    if (lockedUid !== uid) {
      throw new Error(`CRITICAL: Resolved user_id (${uid}) does not match locked user_id (${lockedUid}).`);
    }
  } else {
    fs.writeFileSync(LOCK_FILE_PATH, uid, 'utf8');
  }

  const safeClient = {
    _uid: uid,
    from: (tableName) => {
      if (!ALLOWED_TABLES.includes(tableName)) {
        throw new Error(`SECURITY EXCEPTION: Table '${tableName}' is not in the allowlist.`);
      }

      const chain = rawClient.from(tableName);
      const originalSelect = chain.select.bind(chain);
      const originalInsert = chain.insert.bind(chain);
      const originalUpdate = chain.update.bind(chain);

      chain.select = (...args) => originalSelect(...args);

      chain.insert = (payload) => {
        if (readMostly) throw new Error(`SECURITY EXCEPTION: ${scriptName} is read-mostly. Insert blocked.`);
        if (isDryRun) {
          console.log(`[DRY-RUN] Would insert into ${tableName}:`, payload);
          return { select: () => ({ single: async () => ({ data: payload, error: null }), error: null }), error: null, data: [payload] };
        }
        logAudit({ script: scriptName, action: 'insert', table: tableName, user_id: uid });
        return originalInsert(payload);
      };

      chain.update = (payload) => {
        if (readMostly && tableName !== 'tasks') {
          throw new Error(`SECURITY EXCEPTION: ${scriptName} is read-mostly. Update blocked on ${tableName}.`);
        }
        if (readMostly && tableName === 'tasks') {
           const keys = Object.keys(payload);
           if (keys.length !== 1 || keys[0] !== 'quadrant') {
              throw new Error(`SECURITY EXCEPTION: Read-mostly script can only update 'quadrant' on tasks.`);
           }
        }
        if (isDryRun) {
          console.log(`[DRY-RUN] Would update ${tableName} with:`, payload);
          return { eq: () => ({ error: null, data: [] }), in: () => ({ error: null, data: [] }) };
        }
        logAudit({ script: scriptName, action: 'update', table: tableName, user_id: uid });
        return originalUpdate(payload);
      };

      chain.delete = () => {
        throw new Error(`SECURITY EXCEPTION: .delete() is globally blocked for background scripts.`);
      };

      return chain;
    }
  };

  return safeClient;
}
