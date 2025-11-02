import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { reportWebVitals } from "@/utils/performance";
import { setupGlobalErrorHandlers } from "@/lib/errorHandler";
import { queryClient } from "@/lib/queryClient";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Customers = lazy(() => import("./pages/Customers"));
const GlobalSearch = lazy(() => import("./pages/GlobalSearch"));
const Credits = lazy(() => import("./pages/Credits"));
const Payments = lazy(() => import("./pages/Payments"));
const Outstanding = lazy(() => import("./pages/Outstanding"));
const Profile = lazy(() => import("./pages/Profile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => {
  // Setup global error handlers and report web vitals on mount
  useEffect(() => {
    setupGlobalErrorHandlers();
    reportWebVitals();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner text="Loading application..." />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/credits" element={<Credits />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/outstanding" element={<Outstanding />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/global-search" element={<GlobalSearch />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;