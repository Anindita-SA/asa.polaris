import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.functions.invoke('generate-morning-brief', {
  body: { force: true }
});
if (error) {
  const text = await error.context.text();
  console.log('Error context:', text);
}
