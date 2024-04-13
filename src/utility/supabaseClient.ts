import { createClient } from "@refinedev/supabase";

// const SUPABASE_URL = "https://iwdfzvfqbtokqetmbmbp.supabase.co";
// const SUPABASE_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMDU2NzAxMCwiZXhwIjoxOTQ2MTQzMDEwfQ._gr6kXGkQBi9BM9dx5vKaNKYj_DJN1xlkarprGpM_fU";

const SUPABASE_URL = "https://dwdfetcklixmqxkctbpq.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3ZGZldGNrbGl4bXF4a2N0YnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIzNTIwMzYsImV4cCI6MjAyNzkyODAzNn0.hHiWygljXutBO84vzU7dUvAzzVUeZ8qpCg7ZcsvpgUE";



export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: true,
  },
});
