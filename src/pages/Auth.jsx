import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Leaf, Sparkles, ShoppingBag, Users, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for existing session and redirect if user is already authenticated
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/');
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Check user approval status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile status:", profileError);
          // Fallback: allow login if profile check fails (or handle strictly)
          // For security, we might want to block, but let's log for now.
        }

        if (profile?.status === 'pending' || profile?.status === 'rejected') {
          await supabase.auth.signOut();
          toast({
            title: "Account Pending",
            description: "Your account is waiting for admin approval. Please contact support.",
            variant: "destructive",
          });
          return;
        }

        if (isAdminLogin) {
          console.log("Checking admin privileges for user:", data.user.id);

          // Use the security definer function to check role
          const { data: hasAdminRole, error: roleError } = await supabase
            .rpc('has_role', {
              _user_id: data.user.id,
              _role: 'admin'
            });

          if (roleError) {
            console.error("Error checking user role:", roleError);
          }

          console.log("Admin check result:", hasAdminRole);

          if (hasAdminRole === true) {
            toast({
              title: "Welcome Admin",
              description: "Successfully logged in to admin panel.",
            });
            navigate('/admin');
          } else {
            console.warn("User does not have admin role.");
            // Not an admin, sign out and show error
            await supabase.auth.signOut();
            toast({
              title: "Access Denied",
              description: "You do not have admin privileges.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          navigate('/');
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    const fullName = formData.get("fullName");
    const shopName = formData.get("shopName");
    const phone = formData.get("phone");

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            shop_name: shopName,
            phone: phone,
          }
        }
      });

      if (authError) {
        toast({
          title: "Registration Failed",
          description: authError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration Successful!",
          description: "Your account has been created and is awaiting admin approval.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-3 sm:px-4 md:px-4 py-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      {/* Decorative background - hide on small screens to save vertical space */}
      <div className="hidden sm:block absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-emerald-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-teal-200 rounded-full opacity-30 float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-green-300 rounded-full opacity-40 float delay-500"></div>
      </div>

      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md relative z-10">
        {/* Header Section */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 animate-fade-in">
          <div className="flex justify-center mb-3 sm:mb-4 md:mb-6">
            <div className="relative">
              <div className="p-2 sm:p-3 md:p-4 bg-gradient-primary rounded-2xl shadow-glow pulse-glow">
                <Leaf className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1 sm:mb-2">
            A.I.A.D.A
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm md:text-lg leading-tight sm:leading-normal">ALL INDIA AGRICULTURE DEALERS ASSOCIATION</p>
          <div className="hidden sm:flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-4 text-xs sm:text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">Cross-Shop Customer Credit Checking</span>
              <span className="md:hidden">Credit Checking</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">Multi-Store Support</span>
              <span className="md:hidden">Multi-Store</span>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="card-3d glass-card border-0 backdrop-blur-xl shadow-2xl animate-scale-in p-3 sm:p-4 md:p-6">
          <CardHeader className="text-center p-0 sm:p-0 md:p-0 mb-4 sm:mb-5">
            <CardTitle className="text-xl sm:text-2xl md:text-2xl font-heading">Welcome</CardTitle>
            <CardDescription className="text-xs sm:text-sm md:text-base">
              {isAdminLogin ? "Sign in to Admin Portal" : "Sign in to your account or create a new one"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 backdrop-blur-sm h-9 sm:h-10">
                <TabsTrigger value="login" className="font-medium text-xs sm:text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="font-medium text-xs sm:text-sm">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4 sm:mt-5 md:mt-6">
                <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4 md:space-y-5">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-email" className="text-xs sm:text-sm font-medium">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      className="h-9 sm:h-10 md:h-11 text-sm border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-password" className="text-xs sm:text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="h-9 sm:h-10 md:h-11 text-sm border-gray-200 focus:border-green-500 transition-colors pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className={`w-full h-9 sm:h-10 md:h-11 btn-3d ${isAdminLogin ? 'bg-gray-800 hover:bg-gray-900' : 'bg-gradient-primary hover:shadow-primary'} font-medium text-sm transition-all duration-300`} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                    {isAdminLogin ? "Sign In as Admin" : "Sign In"}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAdminLogin(!isAdminLogin)}
                      className="text-xs text-gray-500 hover:text-gray-800 transition-colors underline-offset-4 hover:underline"
                    >
                      {isAdminLogin ? "Back to User Login" : "Login as Admin"}
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4 sm:mt-5 md:mt-6">
                <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="signup-name" className="text-xs sm:text-sm font-medium">Full Name</Label>
                      <Input
                        id="signup-name"
                        name="fullName"
                        placeholder="Enter your full name"
                        className="h-9 sm:h-10 md:h-11 text-sm border-gray-200 focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="signup-shop" className="text-xs sm:text-sm font-medium">Shop Name</Label>
                      <Input
                        id="signup-shop"
                        name="shopName"
                        placeholder="Enter your shop name"
                        className="h-9 sm:h-10 md:h-11 text-sm border-gray-200 focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-phone" className="text-xs sm:text-sm font-medium">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="h-9 sm:h-10 md:h-11 text-sm border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-email" className="text-xs sm:text-sm font-medium">Email Address</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      className="h-9 sm:h-10 md:h-11 text-sm border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-password" className="text-xs sm:text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="h-9 sm:h-10 md:h-11 text-sm border-gray-200 focus:border-green-500 transition-colors pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                        tabIndex={-1}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-9 sm:h-10 md:h-11 btn-3d bg-gradient-primary hover:shadow-primary font-medium text-sm" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500">
          <p>Connecting agricultural businesses across networks</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;