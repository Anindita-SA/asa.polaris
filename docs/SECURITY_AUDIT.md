# Security Audit

## Data Isolation
Polaris uses Supabase PostgreSQL as its primary database. Because this is a personal application, all tables are secured using **Row Level Security (RLS)**.

Every single table containing user data (including recently secured tables like `workout_goals`, `workout_performance`, and `plan_exercises`) implements the following policy pattern:
```sql
CREATE POLICY "Users can only access their own data"
ON table_name FOR ALL
USING (auth.uid() = user_id);
```
This guarantees that no external user can read or manipulate the data, even if they obtain the anon key. No table relies on weak `auth only` or `Allow all for authenticated` policies.

## Local Automation Security
Background scripts (such as the Local LLM task triage) use a `safe_supabase.js` wrapper. This layer acts as a strict firewall:
- It blocks scripts from touching unauthorized tables.
- It explicitly blocks any destructive `.delete()` operations.
- All automated database writes are logged persistently to `scripts/logs/audit.jsonl` for full traceability.

## Authentication
Authentication is handled entirely via Supabase Auth (Google OAuth provider). The application does not store or hash passwords manually.

## API Key Management
- **Supabase Keys**: Stored in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Google API**: The Google API Client ID and API Key used for Google Calendar and Tasks integration are scoped down to readonly permissions (`calendar.readonly`) and are managed via Google Cloud Console.
- **Edge Functions**: API keys (e.g., Firecrawl, Groq) and backend Supabase keys for Edge Functions are secured via Supabase `vault.secrets`.

## XSS & Embedded Content
- React handles escaping output by default, mitigating standard XSS vectors.
- The **Play View** feature embeds external URLs via `<iframe>`. To ensure safety:
  - The iframe sandbox attributes should be strictly limited to what is necessary for web games (e.g., `allow-scripts`, `allow-same-origin`).
