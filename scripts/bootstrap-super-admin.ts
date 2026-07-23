import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/bootstrap-super-admin.ts <email>");
    process.exit(1);
  }

  console.log(`Looking up user by email: ${email}`);

  // Fetch the user from auth.users (requires service_role)
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Failed to list auth users:", authError.message);
    process.exit(1);
  }

  const user = authUser.users.find((u) => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found in auth system. Have they registered?`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id}. Elevating to super_admin...`);

  // Update their profile role to super_admin
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update profile:", updateError.message);
    process.exit(1);
  }

  console.log("Successfully elevated user to super_admin.");
}

main().catch(console.error);
