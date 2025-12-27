import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oeoregtrowjcebmwzcuf.supabase.co';
// WARNING: This is the Service Role key. In a production app, you MUST use the Anon Key.
// We are using this here because it was the only key provided.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lb3JlZ3Ryb3dqY2VibXd6Y3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgyMDM0NCwiZXhwIjoyMDgxMzk2MzQ0fQ.jnA8K6EO7PPz9DLxaJ9JRtlAJpeSR9jVhdevU71LSwY';

export const supabase = createClient(supabaseUrl, supabaseKey);
