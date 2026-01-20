# 🌾 A.I.A.D.A - All India Agriculture Dealers Association

<div align="center">
++++++++++++++++++` 
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)d
![Supabase](https://img.shields.io/badge/Supabase-2.57-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**A production-grade, cross-shop customer credit management system for agriculture dealers across India**

[Live Demo](https://aiada.lovable.app/) • [Features](#-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture)

</div>

---

## 📋 Overview

A.I.A.D.A is a comprehensive **Full-Stack SaaS Application** designed for agriculture dealers to manage customer credits across multiple shops. The platform enables real-time tracking of credit transactions, payment processing, defaulter management, and provides a unified global search system for credit verification.

### 🎯 Problem Solved
Agriculture dealers across India face challenges tracking customer credit across multiple shops. A customer might default on credit at one shop and then try to obtain credit at another. **A.I.A.D.A solves this** by providing a centralized platform where dealers can:
- Track customer credit history across all registered shops
- Identify defaulters before issuing new credit
- Manage payments and outstanding balances in real-time
- Get instant access to customer credit status via global search

---

## 🚀 Features

### Core Features
| Feature | Description |
|---------|-------------|
| **Multi-Shop Credit Management** | Issue, track, and manage customer credits across multiple shops |
| **Global Defaulter Search** | Search any customer by Aadhar number to check credit history across all shops |
| **Real-time Dashboard** | Live statistics with instant updates using Supabase Realtime |
| **Payment Processing** | Full and partial payment recording with multiple payment methods |
| **Admin Panel** | User approval workflow, role-based access control (RBAC) |
| **Customer Management** | Complete customer lifecycle management with transaction history |

### Technical Highlights
| Implementation | Benefit |
|----------------|---------|
| **Code Splitting & Lazy Loading** | Reduced initial bundle size by ~40%, faster First Contentful Paint |
| **Debounced Search** | Optimized API calls with 300ms debounce, preventing unnecessary requests |
| **React Query Caching** | Smart cache invalidation with stale-while-revalidate pattern |
| **Real-time Subscriptions** | Instant UI updates via Supabase PostgreSQL triggers |
| **Idempotency Protection** | Prevents duplicate submissions using unique idempotency keys |
| **RLS (Row Level Security)** | Database-level security ensuring users can only access their data |

---

## 🛠 Tech Stack

### Frontend
```
├── React 18.3           # UI Library with Concurrent Features
├── TypeScript 5.8       # Type-safe Development
├── Vite 5.4             # Next-gen Build Tool with HMR
├── TailwindCSS 3.4      # Utility-first CSS Framework
├── Radix UI             # Accessible Component Primitives
├── React Query 5.x      # Server State Management
├── React Router 6.x     # Client-side Routing
├── React Hook Form      # Performant Form Handling
├── Zod                  # Schema Validation
└── Recharts             # Data Visualization
```

### Backend & Database
```
├── Supabase             # Backend-as-a-Service (BaaS)
│   ├── PostgreSQL       # Primary Database
│   ├── Auth             # JWT-based Authentication
│   ├── Realtime         # WebSocket Subscriptions
│   ├── RLS Policies     # Row Level Security
│   └── Edge Functions   # Serverless Functions
└── SQL Migrations       # 27+ Database Migrations
```

### DevOps & Deployment
```
├── Vercel               # Edge Deployment Platform
├── ESLint 9.x           # Code Quality
├── PostCSS              # CSS Processing
└── Git                  # Version Control
```

---

## 🏗 Architecture

### Component Architecture
```
src/
├── components/
│   ├── ui/              # 51+ Reusable UI Components (Shadcn/UI)
│   ├── layouts/         # Page Layouts
│   ├── ErrorBoundary    # Error Handling
│   └── ProtectedRoute   # Route Guards
├── hooks/
│   ├── useDebounce      # Debouncing Hook
│   ├── useIntersectionObserver  # Lazy Loading Detection
│   ├── usePerformanceMonitor    # Performance Metrics
│   └── useSupabaseQuery         # Data Fetching Abstraction
├── lib/
│   ├── cache            # Client-side Caching with TTL
│   ├── errorHandler     # Global Error Handling
│   ├── logger           # Production-ready Logging
│   ├── queryClient      # React Query Configuration
│   └── validations      # Zod Schemas
├── pages/               # 12 Application Pages
└── utils/
    ├── performance      # Web Vitals Monitoring
    └── formatters       # Data Formatting Utilities
```

### Database Schema (PostgreSQL)
```sql
-- Core Tables
├── profiles             # User profiles with shop information
├── customers            # Customer master data
├── global_customers     # Cross-shop customer identity (Aadhar-based)
├── credits              # Credit transactions
└── payments             # Payment records

-- Key Features
├── 27 Database Migrations
├── 10+ RPC Functions (Optimized SQL)
├── Row Level Security Policies
└── Real-time Triggers
```

---

## 📚 Technical Learnings

### Performance Optimization

#### 1. **Code Splitting & Lazy Loading**
```jsx
// Dynamic imports for route-based code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Credits = lazy(() => import("./pages/Credits"));

// Suspense boundary for loading states
<Suspense fallback={<LoadingSpinner />}>
  <Routes>...</Routes>
</Suspense>
```

#### 2. **Debouncing**
```typescript
// Custom hook to prevent excessive API calls
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

#### 3. **Intersection Observer for Lazy Components**
```typescript
// Trigger animations/loading only when elements enter viewport
export function useIntersectionObserver(options) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    // ...
  }, []);
  
  return [targetRef, isIntersecting];
}
```

#### 4. **React Query Caching Strategy**
```typescript
// Smart caching with stale-while-revalidate pattern
const { data, isLoading } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: fetchDashboardStats,
  staleTime: 0,              // Immediately stale for fresh data
  gcTime: 30 * 60 * 1000,    // Keep in cache for 30 minutes
  retry: 2,                  // Retry failed requests
});
```

### Security Implementations

#### 5. **Row Level Security (RLS)**
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own credits"
ON credits FOR SELECT
USING (issued_by = auth.uid());
```

#### 6. **Idempotency Protection**
```typescript
// Prevent duplicate form submissions
const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

const handleSubmit = async () => {
  await supabase.from("credits").insert([{
    ...creditData,
    idempotency_key: idempotencyKey  // Unique key per submission
  }]);
  setIdempotencyKey(crypto.randomUUID());  // New key for next submission
};
```

### Real-time Features

#### 7. **Supabase Real-time Subscriptions**
```typescript
// Subscribe to database changes
supabase
  .channel('dashboard-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'credits',
    filter: `issued_by=eq.${userId}`
  }, () => refetch())
  .subscribe();
```

### Error Handling

#### 8. **React Error Boundary**
```tsx
// Graceful error handling in production
class ErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallbackUI error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

#### 9. **Global Error Handler**
```typescript
// Catch unhandled promise rejections and errors
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', { reason: event.reason });
  event.preventDefault();
});
```

### Performance Monitoring

#### 10. **Web Vitals Tracking**
```typescript
// Monitor Core Web Vitals (FCP, LCP, FID, CLS, TTFB)
export function reportWebVitals() {
  const lcpObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    logPerformanceMetric({
      name: 'LCP',
      value: lastEntry.renderTime,
      rating: getRating(value, 'LCP')
    });
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
}
```

---

## 🔧 Key Technical Implementations

| Pattern | Implementation |
|---------|----------------|
| **State Management** | React Query for server state, React useState for UI state |
| **Form Handling** | React Hook Form + Zod validation schemas |
| **Authentication** | Supabase Auth with JWT, Protected Routes, Admin Routes |
| **Authorization** | Role-based access control (user/admin) with profile status checks |
| **API Layer** | Supabase client with RPC functions for complex queries |
| **Caching** | Multi-layer: React Query (memory) + localStorage (persistent) |
| **Styling** | TailwindCSS with CSS custom properties for theming |
| **Accessibility** | ARIA labels, keyboard navigation, focus management |
| **SEO** | Meta tags, Open Graph, structured data |
| **PWA Ready** | Web manifest, service worker support |

---

## 📊 Performance Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| First Contentful Paint (FCP) | < 1.8s | ✅ |
| Largest Contentful Paint (LCP) | < 2.5s | ✅ |
| Cumulative Layout Shift (CLS) | < 0.1 | ✅ |
| Time to Interactive (TTI) | < 3.8s | ✅ |
| Bundle Size (gzipped) | < 200KB | ✅ |

---

## 🗂 Database Migrations

27+ migrations implementing:
- User status and approval workflow
- Global customer identity system
- Optimized RPC functions for dashboard stats
- Credit history with payment tracking
- Idempotency protection for transactions
- Row Level Security policies
- Admin management capabilities

---

## 🚦 Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/agri-global.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📄 License

This project is proprietary software developed for the All India Agriculture Dealers Association.

---

<div align="center">

**Built with ❤️ for Indian Agriculture Dealers**

</div>
