# How to Apply the Dashboard Performance Fix to Supabase

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"+ New Query"**

## Step 2: Copy and Paste the SQL

Open the file: `supabase/migrations/dashboard_stats_function.sql`

Copy **ALL the SQL code** (everything from the first line to the end).

Paste it into the Supabase SQL editor query box.

## Step 3: Run the Query

Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)

You should see:
```
✓ Query executed successfully
- Created function get_dashboard_stats
- Created 6 indexes
- Granted permissions
```

## Step 4: Verify It Works

In the same SQL editor, run this test query:

```sql
-- Replace the UUID with a real user ID from your database
SELECT * FROM get_dashboard_stats('8e3e9e8e-8e3e-8e3e-8e3e-8e3e8e3e8e3e'::uuid);
```

If successful, you'll see results with columns:
- `total_customers`
- `total_credits_issued`
- `total_payments_received`
- `defaulters_count`
- `defaulters` (JSON)
- `recent_activity` (JSON)
- `user_profile` (JSON)

---

## What This Does

✅ Combines 7 separate queries into 1  
✅ Adds 6 database indexes for faster filtering  
✅ Returns all data as structured JSON  
✅ Optimized with PostgreSQL best practices  

---

## Next Steps

After applying this SQL:
1. Update `src/pages/Dashboard.jsx` to use the new function
2. Restart your dev server
3. Test the dashboard performance

The updated Dashboard.jsx code will be provided next.
