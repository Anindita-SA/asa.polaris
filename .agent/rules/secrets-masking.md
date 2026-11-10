# Secrets Masking & Workspace Protection Discipline

1. Never output a secret value. If displaying an environment variable or secret token, show only the variable name, length, and the last 4 characters (e.g., `SUPABASE_SERVICE_ROLE_KEY: [219 chars] ...w14Y`).
2. Never read .env* files directly. Do not use cat, type, Get-Content, head, tail, or direct file reading tools on `.env`, `.env.agent`, `.env.local`, or any `.env*` file.
3. Masked tool usage: Always use `node scripts/show_env.js` (or `node scripts/show_env.js <path>`) whenever you need to inspect which environment variables exist in the workspace or external locations.
4. Keep high-value secrets out of the workspace: The Supabase service role key, Google OAuth refresh token, and other sensitive admin keys must never reside in workspace `.env` files. They live in an external directory outside the project (such as `E:\secrets\.env`), loaded only by scripts run by the user.
5. Restricted workspace keys: The workspace `.env.agent` file may hold only throwaway, restricted, or empty keys.
