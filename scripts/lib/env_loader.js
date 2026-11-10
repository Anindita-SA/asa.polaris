/**
 * Environment and External Secrets Loader
 *
 * Loads standard workspace .env first, then checks for high-value secrets
 * stored in an isolated directory outside the project workspace (e.g., E:\secrets\.env).
 *
 * This keeps administrative secrets (such as Supabase service role keys and Google OAuth tokens)
 * completely detached from the workspace codebase.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export function loadEnvironment() {
  // 1. Load project root .env if it exists
  const rootEnvPath = path.join(PROJECT_ROOT, '.env');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }

  // 2. Candidate external secret file locations outside the repository
  const candidatePaths = [
    process.env.POLARIS_SECRETS_PATH,
    'E:\\secrets\\.env',
    'E:\\secrets\\polaris.env',
    path.resolve(PROJECT_ROOT, '../secrets/.env'),
    path.resolve(PROJECT_ROOT, '../secrets/polaris.env')
  ].filter(Boolean);

  let loadedExternal = false;
  for (const extPath of candidatePaths) {
    if (fs.existsSync(extPath)) {
      dotenv.config({ path: extPath, override: true });
      loadedExternal = true;
      break;
    }
  }

  return {
    loadedExternal,
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasGoogleRefreshToken: Boolean(process.env.GOOGLE_REFRESH_TOKEN)
  };
}

// Auto-run on import
loadEnvironment();
