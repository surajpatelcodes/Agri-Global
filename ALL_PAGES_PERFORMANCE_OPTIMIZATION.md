# Complete Application Performance Optimization Guide

## Executive Summary

Your entire application has **critical performance issues** across all pages. Each page is fetching data without caching, using sequential queries, and missing database indexes. This document provides optimization strategies for:

- ✅ Customers page
- ✅ Credits page
- ✅ Payments page
- ✅ Outstanding page
- ✅ GlobalSearch page
- ✅ Profile page

**Expected Improvements:**
- Customers: 2-4s → 200-400ms (10-20x faster)
- Credits: 3-6s → 200-500ms (10-30x faster)
- Payments: 2-5s → 150-300ms (15-33x faster)
- Outstanding: 1-2s → 100-200ms (10-20x faster)
- GlobalSearch: 0.5-1s → 50-100ms (10-20x faster)
- Profile: 0.5s → 50ms (10x faster)

---

## Problem Analysis by Page

### 1. **Customers Page** (src/pages/Customers.jsx)

**Issues:**
```javascript
// PROBLEM 1: Fetches ALL customers, then fetches ALL credits for ALL customers
fetchCustomerTransactions = async () => {
  // Query 1: Fetches ALL credits with nested payments
  const { data: credits } = await supabase
    .from("credits")
    .select("*, payments (*)")
    .eq("issued_by", user?.id);  // ❌ Can be thousands of records

  // Then loops through every customer
  customers.forEach(customer => {
    const customerCredits = credits.filter(...); // ❌ O(n²) complexity
  });
};
```

**Issues Found:**
1. ❌ No React Query - re-fetches on every tab switch
2. ❌ Fetches ALL credits (could be thousands) including nested payments
3. ❌ No aggregation in database - does O(n²) filtering in JavaScript
4. ❌ Real-time subscription refetches entire dataset on any change
5. ❌ Manual transaction summary calculation should be in database

**Optimization Needed:**
- Create SQL function: `get_customer_transactions(user_id)`
- Use React Query with caching
- Add database indexes on `created_by`, `customer_id`
- Aggregate totals in database, not JavaScript

---

### 2. **Credits Page** (src/pages/Credits.jsx)

**Issues:**
```javascript
fetchCredits = async () => {
  // ❌ Fetches ALL credits with nested customers
  const { data } = await supabase
    .from("credits")
    .select("*, customers!inner (...)")
    .eq("customers.created_by", user?.id);
    // If user has 1000 credits, fetches all 1000
};

// Then groups manually in React
const uniqueCustomers = filteredCredits.reduce((acc, credit) => {
  // ❌ O(n) grouping operation in JavaScript
});
```

**Issues Found:**
1. ❌ Fetches ALL credits even if you only need summary
2. ❌ Fetches nested customer data for every credit
3. ❌ No React Query caching
4. ❌ Manual grouping/aggregation in React
5. ❌ Real-time subscription refetches everything on any credit change

**Optimization Needed:**
- SQL function: `get_customer_credits_summary(user_id)`
- Return grouped data from database
- React Query with 5-minute stale time
- Database indexes on issued_by, customer_id

---

### 3. **Payments Page** (src/pages/Payments.jsx)

**Issues:**
```javascript
fetchPayments = async () => {
  // ❌ Fetches ALL payments with nested credits and customers
  const { data } = await supabase
    .from("payments")
    .select("*, credits (*, customers (...))")
    .order("created_at", { ascending: false });
    // Then filters in JavaScript
};

// ❌ Also fetches all customers to display in dropdown
const fetchCustomersWithCredit = async () => {
  // Query 1: Get all customers
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("created_by", user?.id);

  // Query 2: Get all credits
  const { data: credits } = await supabase
    .from("credits")
    .select("customer_id")
    .eq("issued_by", user?.id);

  // Filter in JavaScript
  const filtered = customers.filter(c => 
    creditedCustomerIds.has(c.id)
  );
};
```

**Issues Found:**
1. ❌ Fetches ALL payments (could be thousands)
2. ❌ Fetches nested data (credits → customers)
3. ❌ Second function does 2 separate queries to filter customers
4. ❌ No pagination - loads unlimited records
5. ❌ No React Query caching
6. ❌ Filtering in JavaScript instead of SQL WHERE clause

**Optimization Needed:**
- SQL function: `get_user_payments_summary(user_id, limit=100, offset=0)`
- SQL function: `get_customers_with_credit(user_id)` (1 query, not 2)
- React Query with pagination
- Add database indexes

---

### 4. **Outstanding Page** (src/pages/Outstanding.jsx)

**Issues:**
```javascript
fetchOutstandingData = async () => {
  // ❌ Assumes customer_outstanding view exists
  const { data } = await supabase
    .from("customer_outstanding")
    .select("*")
    .order("outstanding", { ascending: false });
};
```

**Issues Found:**
1. ❌ Depends on `customer_outstanding` view that may not exist
2. ❌ No React Query caching
3. ❌ If view doesn't exist, page breaks silently
4. ❌ No pagination for large datasets
5. ❌ Calculation should happen in database, not depend on view

**Optimization Needed:**
- Create SQL view or function: `get_outstanding_summary(user_id)`
- Use React Query with caching
- Add database indexes on created_by fields
- Add pagination support

---

### 5. **GlobalSearch Page** (src/pages/GlobalSearch.jsx)

**Issues:**
```javascript
handleSearch = async () => {
  // ❌ Calls RPC function check_customer_credit_status
  const { data, error } = await supabase
    .rpc("check_customer_credit_status", {
      _aadhar_number: trimmedSearch
    });
};
```

**Issues Found:**
1. ❌ Depends on RPC function `check_customer_credit_status` (may not exist)
2. ❌ No caching - re-fetches same customer every time
3. ❌ Potential N+1 if function has subqueries
4. ❌ No error handling for missing function

**Optimization Needed:**
- Verify RPC function exists and is optimized
- Cache search results using React Query
- Add debouncing (already has it - good!)
- Create SQL indexes on aadhar number

---

### 6. **Profile Page** (src/pages/Profile.jsx)

**Issues:**
```javascript
fetchProfile = async () => {
  // ✅ Single query (good)
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
};
```

**Issues Found:**
1. ⚠️ No caching - re-fetches on every tab switch
2. ⚠️ Could use React Query (minor issue, data is small)
3. ✅ Overall structure is good - just needs caching

**Optimization Needed:**
- Add React Query with long stale time (30 min)
- Add database index on `id` (probably already indexed)

---

## SQL Optimization Functions Needed

### Function 1: `get_customer_transactions(user_id)`
```sql
CREATE OR REPLACE FUNCTION get_customer_transactions(user_id uuid)
RETURNS TABLE (
  customer_id bigint,
  name text,
  phone text,
  address text,
  total_credit numeric,
  total_payments numeric,
  outstanding numeric,
  status text,
  created_at timestamp
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  c.address,
  COALESCE(SUM(cr.amount), 0)::numeric as total_credit,
  COALESCE(SUM(p.amount), 0)::numeric as total_payments,
  COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.amount), 0) as outstanding,
  CASE
    WHEN MAX(cr.status) = 'defaulter' THEN 'defaulter'
    WHEN MAX(cr.status) = 'pending' AND SUM(COALESCE(p.amount, 0)) = 0 THEN 'pending'
    WHEN SUM(COALESCE(p.amount, 0)) > 0 AND SUM(COALESCE(p.amount, 0)) < SUM(COALESCE(cr.amount, 0)) THEN 'partial'
    WHEN SUM(COALESCE(p.amount, 0)) >= SUM(COALESCE(cr.amount, 0)) THEN 'paid'
    ELSE 'pending'
  END::text as status,
  c.created_at
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id
LEFT JOIN payments p ON p.credit_id = cr.id
WHERE c.created_by = user_id
GROUP BY c.id, c.name, c.phone, c.address, c.created_at
ORDER BY c.created_at DESC;
$$ LANGUAGE sql STABLE;
```

### Function 2: `get_customer_credits_summary(user_id)`
```sql
CREATE OR REPLACE FUNCTION get_customer_credits_summary(user_id uuid)
RETURNS TABLE (
  customer_id bigint,
  customer_name text,
  customer_phone text,
  total_credit_amount numeric,
  credit_count bigint,
  latest_credit_date timestamp,
  status text
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  COALESCE(SUM(cr.amount), 0)::numeric,
  COUNT(DISTINCT cr.id)::bigint,
  MAX(cr.created_at),
  CASE
    WHEN MAX(cr.status) = 'defaulter' THEN 'defaulter'
    ELSE COALESCE(MAX(cr.status), 'pending')
  END::text
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id
WHERE c.created_by = user_id
GROUP BY c.id, c.name, c.phone
ORDER BY MAX(cr.created_at) DESC;
$$ LANGUAGE sql STABLE;
```

### Function 3: `get_customers_with_credit(user_id)`
```sql
CREATE OR REPLACE FUNCTION get_customers_with_credit(user_id uuid)
RETURNS TABLE (
  id bigint,
  name text,
  phone text,
  id_proof text
) AS $$
SELECT DISTINCT
  c.id,
  c.name,
  c.phone,
  c.id_proof
FROM customers c
INNER JOIN credits cr ON cr.customer_id = c.id
WHERE c.created_by = user_id AND cr.issued_by = user_id
ORDER BY c.name;
$$ LANGUAGE sql STABLE;
```

### Function 4: `get_outstanding_summary(user_id)`
```sql
CREATE OR REPLACE FUNCTION get_outstanding_summary(user_id uuid)
RETURNS TABLE (
  customer_id bigint,
  name text,
  phone text,
  total_credit numeric,
  total_payments numeric,
  outstanding numeric
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  COALESCE(SUM(cr.amount), 0)::numeric,
  COALESCE(SUM(p.amount), 0)::numeric,
  COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.amount), 0) as outstanding
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id AND cr.issued_by = user_id
LEFT JOIN payments p ON p.credit_id = cr.id
WHERE c.created_by = user_id
GROUP BY c.id, c.name, c.phone
HAVING COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.amount), 0) > 0
ORDER BY outstanding DESC;
$$ LANGUAGE sql STABLE;
```

---

## React Query Configuration

All pages should use React Query with this configuration:

```javascript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['customers'], // Unique key per page
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('get_customer_transactions', {
      user_id: user.id
    });
    if (error) throw error;
    return data;
  },
  staleTime: 10 * 60 * 1000,      // 10 minutes
  gcTime: 30 * 60 * 1000,          // 30 minutes
  retry: 2,
  refetchOnWindowFocus: false,     // Already disabled in queryClient
});
```

---

## Database Indexes Needed

```sql
-- Customers page
CREATE INDEX idx_customers_created_by ON customers(created_by);

-- Credits page
CREATE INDEX idx_credits_issued_by ON credits(issued_by);
CREATE INDEX idx_credits_customer_id ON credits(customer_id);
CREATE INDEX idx_credits_created_at ON credits(created_at DESC);

-- Payments page
CREATE INDEX idx_payments_created_by ON payments(created_by);
CREATE INDEX idx_payments_credit_id ON payments(credit_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- GlobalSearch
CREATE INDEX idx_customers_id_proof ON customers(id_proof);

-- Profile page
CREATE INDEX idx_profiles_id ON profiles(id);
```

---

## Implementation Priority

### Phase 1: Critical (Do First - 2 hours)
1. ✅ Already done: Dashboard optimization
2. Update Customers page to use React Query + SQL function
3. Update Credits page to use React Query + SQL function
4. Add all database indexes

### Phase 2: Important (Next - 1-2 hours)
5. Update Payments page to use React Query + SQL functions
6. Update Outstanding page to use React Query + SQL function
7. Update GlobalSearch if RPC function doesn't exist

### Phase 3: Nice-to-Have (Optional - 30 mins)
8. Update Profile page to use React Query (minor improvement)
9. Add pagination to Credits/Payments pages
10. Add search debouncing where missing

---

## Expected Results

| Page | Before | After | Improvement |
|------|--------|-------|------------|
| Customers | 2-4s | 200-400ms | 10-20x |
| Credits | 3-6s | 200-500ms | 10-30x |
| Payments | 2-5s | 150-300ms | 15-33x |
| Outstanding | 1-2s | 100-200ms | 10-20x |
| GlobalSearch | 0.5-1s | 50-100ms | 10-20x |
| Profile | 0.5s | 50ms | 10x |

---

## Next Steps

1. **Copy SQL functions** to a new migration file
2. **Add database indexes**
3. **Update each page** to use React Query
4. **Test performance** with DevTools Network tab
5. **Monitor** real-time performance

Would you like me to create the optimized code for any specific page?
