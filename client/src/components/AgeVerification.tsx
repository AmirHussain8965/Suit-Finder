import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function AgeVerification() {
  const [month, setMonth] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const verifyMutation = useMutation({
    mutationFn: async (birthDate: Date) => {
      const response = await apiRequest("POST", "/api/profiles/verify-age", { birthDate: birthDate.toISOString() });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "Age Verified",
        description: "Welcome to Formal Findings.",
      });
    },
    onError: (err: any) => {
      setError(err.message || "Failed to verify age");
    },
  });

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const days = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => ({
    value: String(currentYear - 21 - i),
    label: String(currentYear - 21 - i),
  }));

  const handleSubmit = () => {
    setError("");
    
    if (!month || !day || !year) {
      setError("Please enter your complete date of birth");
      return;
    }

    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const age = calculateAge(birthDate);

    if (age < 21) {
      setError("You must be 21 years or older to use this application.");
      return;
    }

    verifyMutation.mutate(birthDate);
  };

  const selectClassName = "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-accent" />
          </div>
          <CardTitle className="text-2xl font-serif text-foreground">Age Verification Required</CardTitle>
          <CardDescription className="text-muted-foreground">
            This application contains adult content. You must be 21 years or older to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-foreground">Date of Birth</Label>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={selectClassName}
                data-testid="select-month"
              >
                <option value="">Month</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={selectClassName}
                data-testid="select-day"
              >
                <option value="">Day</option>
                {days.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={selectClassName}
                data-testid="select-year"
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={verifyMutation.isPending}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="button-verify-age"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Age & Continue"
            )}
          </Button>

          <div className="space-y-3 text-xs text-muted-foreground border-t border-border pt-4">
            <p className="font-semibold text-foreground">Legal Notice & Disclaimer</p>
            <p>
              By clicking "Verify Age & Continue," you certify under penalty of perjury that you are at least 21 years of age and legally permitted to access adult-oriented content in your jurisdiction.
            </p>
            <p>
              <strong>Assumption of Risk:</strong> You acknowledge that this platform facilitates connections between consenting adults. All interactions, meetups, and activities arranged through this service are undertaken at your own risk. The operator assumes no liability for any injury, harm, loss, or damage arising from user interactions.
            </p>
            <p>
              <strong>User Responsibility:</strong> You are solely responsible for verifying the identity, age, health status, and intentions of other users. The operator does not conduct background checks or verify user-provided information.
            </p>
            <p>
              <strong>No Warranty:</strong> This service is provided "as is" without warranties of any kind. The operator disclaims all liability for user-generated content, accuracy of profiles, or outcomes of user interactions.
            </p>
            <p>
              <strong>Indemnification:</strong> You agree to indemnify and hold harmless the operator from any claims, damages, or expenses arising from your use of this platform or violation of these terms.
            </p>
            <p>
              <strong>Health Disclaimer:</strong> Health information shared by users (including HIV status, PrEP usage, and STD screening dates) is self-reported and not verified. Always practice safe interactions and consult healthcare professionals for medical advice.
            </p>
            <p className="pt-2">
              By proceeding, you acknowledge that you have read, understood, and agree to be bound by these terms and our full Terms of Service and Privacy Policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
