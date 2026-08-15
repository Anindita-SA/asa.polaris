# Security Audit

## Data Isolation
Polaris uses Supabase PostgreSQL as its primary database. Because this is a personal application, all tables are secured using **Row Level Security (RLS)**.

Every single table containing user data implements the following policy pattern:
```sql
CREATE POLICY "Users can only access their own data"
ON table_name FOR ALL
USING (auth.uid() = user_id);
```
This guarantees that no external user can read or manipulate the data, even if they obtain the anon key.

## Authentication
Authentication is handled entirely via Supabase Auth (Google OAuth provider). The application does not store or hash passwords manually.

## API Key Management
- **Supabase Keys**: Stored in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Google API**: The Google API Client ID and API Key used for Google Calendar and Tasks integration are scoped down to readonly permissions (`calendar.readonly`) and are managed via Google Cloud Console.

## XSS & Embedded Content
- React handles escaping output by default, mitigating standard XSS vectors.
- The **Play View** feature embeds external URLs via `<iframe>`. To ensure safety:
  - The iframe sandbox attributes should be strictly limited to what is necessary for web games (e.g., `allow-scripts`, `allow-same-origin`).
