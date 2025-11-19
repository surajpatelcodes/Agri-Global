import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, DollarSign, TrendingUp, Plus, Eye, FileText, Calendar, Sparkles, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AnimatedCard from "@/components/AnimatedCard";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";

const Dashboard = memo(() => {
  usePerformanceMonitor('Dashboard');
  const navigate = useNavigate();
  const [showDefaulters, setShowDefaulters] = useState(false);
  const { toast } = useToast();

  // ⭐ PERFORMANCE IMPROVEMENT: Fetch all dashboard data with a single query using React Query
  // This replaces 7 separate database calls with 1 optimized RPC call
  const fetchDashboardStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      user_id: user.id,
    });

    if (error) throw error;
    return data?.[0] || null;
  };

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    // Immediately stale - ensures invalidations trigger refetches
    staleTime: 0,
    // Keep in memory for 30 minutes
    gcTime: 30 * 60 * 1000,
    // Retry failed requests
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Extract data from the query response
  const stats = {
    totalCustomers: dashboardData?.total_customers || 0,
    totalCredits: dashboardData?.total_credits_issued || 0,
    totalPayments: dashboardData?.total_payments_received || 0,
    defaultersCount: dashboardData?.defaulters_count || 0,
  };

  const defaulters = dashboardData?.defaulters || [];
  const recentActivity = dashboardData?.recent_activity || [];
  const userProfile = dashboardData?.user_profile || {};

  if (error) {
    return (
      <div className="space-y-8" role="alert">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Error Loading Dashboard</CardTitle>
            <CardDescription className="text-red-700">
              {error?.message || 'Failed to load dashboard data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Retry Loading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Memoized dashboard cards configuration
  const dashboardCards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Total Credits Issued",
      value: formatCurrency(stats.totalCredits),
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-100",
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Total Payments Received",
      value: formatCurrency(stats.totalPayments),
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Defaulters",
      value: stats.defaultersCount,
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-100",
      gradient: "from-red-500 to-red-600",
      onClick: () => setShowDefaulters(true),
    },
  ];

  const quickActions = [
    {
      title: "Add Customer",
      description: "Register new customer",
      icon: Users,
      action: () => navigate('/?add=1#customers'),
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Issue Credit",
      description: "Create new credit",
      icon: CreditCard,
      action: () => navigate('/credits'),
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Record Payment",
      description: "Add new payment",
      icon: DollarSign,
      action: () => navigate('/payments'),
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "View Reports",
      description: "Coming Soon",
      icon: FileText,
      action: () => navigate('/outstanding'),
      gradient: "from-orange-500 to-orange-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in" role="status" aria-live="polite" aria-label="Loading dashboard">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-2 w-1/3" />
          <div className="h-4 bg-muted rounded mb-6 w-1/2" />
        </div>
        <SkeletonGrid count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" role="main" aria-label="Dashboard">
      {/* Welcome Section */}
      <AnimatedCard animation="fade-in">
        <section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 text-white"
          role="banner"
          aria-label="Welcome section"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" aria-hidden="true" />
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-heading font-bold mb-2 flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-yellow-300" aria-hidden="true" />
                  <span>{getGreeting()}, {userProfile?.full_name || 'Welcome'}!</span>
                </h1>
                <p className="text-green-100 text-lg">
                  {userProfile?.shop_name && `Managing ${userProfile.shop_name}`} • Personal Dashboard
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-200 mb-1">Today</div>
                <div className="text-2xl font-bold">
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    weekday: 'short'
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 opacity-10" aria-hidden="true">
            <Calendar className="h-24 w-24" />
          </div>
        </section>
      </AnimatedCard>

      {/* Stats Cards */}
      <section aria-label="Statistics overview">
        <div className="responsive-grid">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <AnimatedCard key={index} delay={index * 100} animation="scale-in">
                <Card
                  className="card-3d hover-glow group cursor-pointer overflow-hidden border-0 shadow-lg"
                  onClick={card.onClick}
                  role="button"
                  tabIndex={0}
                  aria-label={`${card.title}: ${card.value}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      card.onClick?.();
                    }
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {card.title}
                    </CardTitle>
                    <div className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {card.value}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      <span>Your data</span>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            );
          })}
        </div>
      </section>

      {/* Recent Activity & Quick Actions */}
      <div className="responsive-grid-2">
        {/* Recent Activity */}
        <AnimatedCard animation="slide-right" delay={200}>
          <Card className="card-3d hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg" aria-hidden="true">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-3 h-3 rounded-full ${activity.type === 'credit' ? 'bg-green-500' : 'bg-blue-500'
                      }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.type === 'credit' ? 'Credit issued' : 'Payment received'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {activity.customer} • {formatCurrency(activity.amount)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTimeAgo(activity.time)}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard animation="slide-left" delay={200}>
          <Card className="card-3d hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg" aria-hidden="true">
                  <Plus className="h-5 w-5 text-purple-600" />
                </div>
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      className="h-auto p-4 flex-col gap-3 hover:shadow-lg transition-all duration-300 group border border-gray-100 hover:border-gray-200"
                      onClick={action.action}
                    >
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} text-white group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">{action.title}</div>
                        <div className="text-xs text-gray-500">{action.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Defaulters Dialog */}
      <Dialog open={showDefaulters} onOpenChange={setShowDefaulters}>
        <DialogContent
          className="max-w-md"
          role="dialog"
          aria-labelledby="defaulters-dialog-title"
          aria-describedby="defaulters-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="defaulters-dialog-title" className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
              Defaulters
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {defaulters.length > 0 ? (
              defaulters.map((customer) => (
                <div key={customer.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-medium text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-600">{customer.phone}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No defaulters found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;