import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const Dashboard = lazy(() => import("./Dashboard"));
const Customers = lazy(() => import("./Customers"));
const Credits = lazy(() => import("./Credits"));
const GlobalSearch = lazy(() => import("./GlobalSearch"));
const Profile = lazy(() => import("./Profile"));

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Sync activeTab with URL hash for navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '') || 'dashboard';
    if (hash !== activeTab && ['dashboard', 'customers', 'credits', 'profile', 'global-search'].includes(hash)) {
      setActiveTab(hash);
    }

    // Set default hash if none present
    if (!location.hash) {
      navigate('/#dashboard', { replace: true });
    }
  }, [location.hash, navigate, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "customers":
        return <Customers />;
      case "credits":
        return <Credits />;

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
    // Use hash navigation to keep everything in the same route
    navigate(`/#${tab}`, { replace: false });
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