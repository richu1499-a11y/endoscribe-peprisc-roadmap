# Supabase Setup

## Files

- `schema.sql` -- Creates all tables, triggers, and RLS policies
- `seed.sql` -- Inserts 13 workstreams, 64 tasks, 5 milestones, 5 risks, and 4 decisions

## Setup Steps

1. Create a Supabase project at supabase.com
2. Open the SQL Editor in the Supabase dashboard
3. Paste and run `schema.sql` first
4. Paste and run `seed.sql` second
5. Go to Database > Replication and enable Realtime for the `tasks` table
6. Copy the Project URL and anon key from Settings > API
7. Add them to `.env.local` in the project root

## Safety

Do not insert PHI, patient identifiers, or clinical data into these tables.
