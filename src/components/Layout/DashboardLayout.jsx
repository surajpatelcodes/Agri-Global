import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  DollarSign, 
  BarChart3, 
  Menu, 
  X,
  LogOut,
  Leaf,
  Network,
  Sparkles,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

const DashboardLayout = ({ children, activeTab, onTabChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      id: "credits",
      label: "Credits",
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      id: "payments",
      label: "Payments",
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      id: "global-search",
      label: "Global Search",
      icon: BarChart3,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="p-3 bg-gradient-primary rounded-2xl shadow-glow">
                <Leaf className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Network className="h-4 w-4 text-green-500 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                A.I.A.D.A
              </h1>
              <p className="text-xs text-gray-500 font-medium">ALL INDIA AGRICULTURE DEALERS ASSOCIATION</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden hover:bg-gray-100 rounded-xl"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto min-h-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-4 px-4 py-4 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-primary text-white shadow-primary"
                    : "text-gray-700 hover:bg-gray-100/80 hover:shadow-lg hover:scale-[1.02]"
                )}
              >
                {/* Background gradient for active state */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20"></div>
                )}
                
                <div className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 relative z-10",
                  isActive
                    ? "bg-white/20 backdrop-blur-sm"
                    : `${item.bgColor} group-hover:scale-110`
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    isActive ? "text-white" : item.color
                  )} />
                </div>
                <span className={cn(
                  "font-semibold relative z-10 transition-colors duration-300",
                  isActive ? "text-white" : "text-gray-700 group-hover:text-gray-900"
                )}>
                  {item.label}
                </span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-gray-100/50 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50/80 rounded-xl py-3 px-4 transition-all duration-300 group"
          >
            <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors duration-300 mr-3">
              <LogOut className="h-4 w-4 text-red-600" />
            </div>
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-xl shadow-sm border-b border-gray-200/50 h-20 flex items-center justify-between px-4 lg:px-8 relative">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden hover:bg-gray-100 rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          {/* Page title */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:block">
              <h2 className="text-2xl font-heading font-bold text-gray-900 capitalize">
                {activeTab}
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Cross-shop data visualization
              </p>
            </div>
            <div className="lg:hidden">
              <h2 className="text-xl font-heading font-bold text-gray-900 capitalize">
                {activeTab}
              </h2>
            </div>
          </div>
          
          {/* Right side - could add user menu, notifications, etc. */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">Live</span>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main id="main-content" className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-white">
          <div className="p-4 lg:p-8 h-full">
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;