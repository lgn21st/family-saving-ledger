/* eslint-disable no-undef */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const run = async () => {
  const { error } = await supabase.rpc("run_monthly_interest");

  if (error) {
    throw new Error(`Failed to run monthly interest: ${error.message}`);
  }

  console.log("Monthly interest settlement complete.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
