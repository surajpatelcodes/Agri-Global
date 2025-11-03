import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const Dashboard = lazy(() => import("./Dashboard"));
const Customers = lazy(() => import("./Customers"));
const Credits = lazy(() => import("./Credits"));
const Payments = lazy(() => import("./Payments"));
const GlobalSearch = lazy(() => import("./GlobalSearch"));
const Profile = lazy(() => import("./Profile"));
const Auth = lazy(() => import("./Auth"));

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Sync activeTab with current route
  useEffect(() => {
    const path = location.pathname;
    const routeToTab = {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/customers': 'customers',
      '/credits': 'credits',
      '/payments': 'payments',
      '/outstanding': 'outstanding',
      '/profile': 'profile',
      '/global-search': 'global-search'
    };
    
    const newTab = routeToTab[path] || 'dashboard';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname]);

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

  const FullPageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner text="Loading..." />
    </div>
  );

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return (
      <Suspense fallback={<FullPageLoader />}>
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const tabToRoute = {
      'dashboard': '/',
      'customers': '/customers',
      'credits': '/credits',
      'payments': '/payments',
      'outstanding': '/outstanding',
      'profile': '/profile',
      'global-search': '/global-search'
    };
    navigate(tabToRoute[tab] || '/');
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      <Suspense fallback={<div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}>
        {renderContent()}
      </Suspense>
    </DashboardLayout>
  );
};

export default Index;