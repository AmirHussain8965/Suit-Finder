import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Lock } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { SuitedSilhouettes } from "@/components/SuitedSilhouettes";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(search).get("token");

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsValid(false);
        return;
      }
      setIsValid(true);
      setIsValidating(false);
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }
      
      setSuccess(true);
      toast({ 
        title: "Password Reset",
        description: "Your password has been reset successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <SuitedSilhouettes variant="tuxedo" />
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="mt-4 text-muted-foreground">Validating reset link...</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <SuitedSilhouettes variant="tuxedo" />
        <div className="w-full max-w-md space-y-6">
          <Card className="border-border">
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle className="font-serif text-xl">Invalid or Expired Link</CardTitle>
              <CardDescription>
                This password reset link is no longer valid. It may have expired or already been used.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => setLocation("/forgot-password")}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="button-request-new-link"
              >
                Request New Reset Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <SuitedSilhouettes variant="tuxedo" />
      <Button 
        variant="ghost" 
        className="absolute top-4 left-4"
        onClick={() => setLocation("/auth")}
        data-testid="button-back-auth"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Sign In
      </Button>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold text-foreground">Formal Findings</h1>
          <p className="text-muted-foreground">Reset Your Password</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              {success ? "Password Reset Complete" : "Create New Password"}
            </CardTitle>
            <CardDescription>
              {success 
                ? "You can now sign in with your new password"
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {success ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-muted-foreground">
                  Your password has been reset successfully.
                </p>
                <Button 
                  onClick={() => setLocation("/auth")}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="button-go-login"
                >
                  Sign In Now
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  Reset Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
