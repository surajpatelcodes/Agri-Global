import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/Layout/DashboardLayout";

const Dashboard = lazy(() => import("./Dashboard"));
const Customers = lazy(() => import("./Customers"));
const Credits = lazy(() => import("./Credits"));
const Payments = lazy(() => import("./Payments"));
const GlobalSearch = lazy(() => import("./GlobalSearch"));
const Profile = lazy(() => import("./Profile"));
const Auth = lazy(() => import("./Auth"));

const Index = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Auth />
      </Suspense>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "customers":
        return <Customers />;
      case "credits":
        return <Credits />;
      case "payments":
        return <Payments />;
      case "global-search":
        return <GlobalSearch />;
      case "profile":
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <Suspense fallback={<LoadingSpinner />}>
        {renderContent()}
      </Suspense>
    </DashboardLayout>
  );
};

export default Index;