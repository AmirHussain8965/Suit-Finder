import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { SuitedSilhouettes } from "@/components/SuitedSilhouettes";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to send reset link");
      }
      
      setSubmitted(true);
      toast({ 
        title: "Check your email",
        description: "If an account exists, you'll receive a reset link."
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
          <p className="text-muted-foreground">Password Recovery</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Forgot Password</CardTitle>
            <CardDescription>
              {submitted 
                ? "Check your email for the reset link"
                : "Enter your email to receive a password reset link"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-muted-foreground">
                  If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-back-login"
                >
                  Return to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={isLoading}
                  data-testid="button-send-reset"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Reset Link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Remember your password?{" "}
          <Button 
            variant="ghost" 
            className="p-0 h-auto text-accent"
            onClick={() => setLocation("/auth")}
            data-testid="link-sign-in"
          >
            Sign In
          </Button>
        </p>
      </div>
    </div>
  );
}
