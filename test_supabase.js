
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oeoregtrowjcebmwzcuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lb3JlZ3Ryb3dqY2VibXd6Y3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgyMDM0NCwiZXhwIjoyMDgxMzk2MzQ0fQ.jnA8K6EO7PPz9DLxaJ9JRtlAJpeSR9jVhdevU71LSwY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing Supabase Connection...");
    try {
        const { data, error } = await supabase.from('memories').select('*').limit(1);
        if (error) {
            console.error("Database Error:", error);
        } else {
            console.log("Database Connection Successful. Data:", data);
        }
    } catch (e) {
        console.error("Unexpected Error:", e);
    }
}

testConnection();
