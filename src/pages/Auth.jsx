import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Leaf, Sparkles, ShoppingBag, Users } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
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
      const { error } = await supabase.auth.signInWithPassword({
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
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
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
          description: "Please check your email to verify your account.",
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-emerald-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-teal-200 rounded-full opacity-30 float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-green-300 rounded-full opacity-40 float delay-500"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow pulse-glow">
                <Leaf className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Agri-Ledger
          </h1>
          <p className="text-gray-600 text-lg">Agricultural Credit Management System</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Cross-Shop Network</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-4 w-4" />
              <span>Multi-Store Support</span>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="card-3d glass-card border-0 backdrop-blur-xl shadow-2xl animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading">Welcome</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account or create a new one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 backdrop-blur-sm">
                <TabsTrigger value="login" className="font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="font-medium">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      className="h-11 border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      className="h-11 border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 btn-3d bg-gradient-primary hover:shadow-primary font-medium" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                      <Input
                        id="signup-name"
                        name="fullName"
                        placeholder="Enter your full name"
                        className="h-11 border-gray-200 focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-shop" className="text-sm font-medium">Shop Name</Label>
                      <Input
                        id="signup-shop"
                        name="shopName"
                        placeholder="Enter your shop name"
                        className="h-11 border-gray-200 focus:border-green-500 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-sm font-medium">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="h-11 border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      className="h-11 border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      className="h-11 border-gray-200 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 btn-3d bg-gradient-primary hover:shadow-primary font-medium" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Connecting agricultural businesses across networks</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;