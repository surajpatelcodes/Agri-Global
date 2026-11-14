import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const hasRecoveryCallback = (hash = "", search = "") => {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(search);

  const isRecoveryType =
    hashParams.get("type") === "recovery" ||
    queryParams.get("type") === "recovery";
  const hasCode = Boolean(hashParams.get("code") || queryParams.get("code"));
  const hasTokens = Boolean(
    hashParams.get("access_token") ||
    hashParams.get("refresh_token") ||
    queryParams.get("access_token") ||
    queryParams.get("refresh_token"),
  );

  return isRecoveryType || hasCode || hasTokens;
};

const ResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        // Supabase auto-detects session from URL hash (#access_token=...&type=recovery)
        // or PKCE ?code= param. Wait briefly for it to settle then verify.
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );

        if (
          !hasRecoveryCallback(window.location.hash, window.location.search)
        ) {
          setError("This password reset link is invalid or expired.");
          setIsVerifying(false);
          return;
        }

        // Handle explicit errors returned in the URL
        const urlError =
          hash.get("error_description") ||
          url.searchParams.get("error_description");
        if (urlError) {
          setError(decodeURIComponent(urlError));
          setIsVerifying(false);
          return;
        }

        // If PKCE ?code= present, exchange it
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(
            window.location.href,
          );
          if (exErr) {
            setError(exErr.message);
            setIsVerifying(false);
            return;
          }
        }

        // Listen for PASSWORD_RECOVERY event briefly
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (
            event === "PASSWORD_RECOVERY" ||
            (session && hash.get("type") === "recovery")
          ) {
            setSessionReady(true);
            setIsVerifying(false);
          }
        });

        // Fallback: check current session
        setTimeout(async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            setSessionReady(true);
          } else {
            setError(
              "Reset link is invalid or has expired. Please request a new one.",
            );
          }
          setIsVerifying(false);
          subscription.unsubscribe();
        }, 800);
      } catch (e) {
        setError(e.message || "Something went wrong.");
        setIsVerifying(false);
      }
    };
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please re-enter the same password.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updErr) {
        toast({
          title: "Reset Failed",
          description: updErr.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Password Updated",
        description: "You can now sign in with your new password.",
      });
      await supabase.auth.signOut();
      window.history.replaceState(null, "", "/auth");
      navigate("/auth", { replace: true });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-3">
            <KeyRound className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Reset Your Password
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Choose a strong new password
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>New Password</CardTitle>
            <CardDescription>
              {sessionReady
                ? "Enter and confirm your new password below."
                : "Link verification failed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && !sessionReady ? (
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showNew ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      minLength={6}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Update Password
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
