import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { usePremiumFeature } from "@/hooks/use-subscription";

interface PremiumGateProps {
  feature: string;
  description?: string;
  children: React.ReactNode;
}

export function PremiumGate({ feature, description, children }: PremiumGateProps) {
  const { isPremium, isLoading } = usePremiumFeature();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return null;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed border-accent/50">
      <CardHeader className="text-center">
        <div className="mx-auto p-3 rounded-full bg-accent/10 w-fit mb-2">
          <Lock className="h-6 w-6 text-accent" />
        </div>
        <CardTitle className="text-lg">{feature}</CardTitle>
        <CardDescription>
          {description || "This feature is available for premium members only."}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => setLocation("/subscription")}
          data-testid="button-upgrade"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Premium
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Starting at $9.99/month
        </p>
      </CardContent>
    </Card>
  );
}

export function PremiumBadge() {
  const { isPremium } = usePremiumFeature();
  const [, setLocation] = useLocation();

  if (isPremium) {
    return (
      <div className="flex items-center gap-1 text-accent text-xs">
        <Crown className="h-3 w-3" />
        Premium
      </div>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-accent hover:text-accent/80"
      onClick={() => setLocation("/subscription")}
      data-testid="button-upgrade-badge"
    >
      <Crown className="h-3 w-3 mr-1" />
      Upgrade
    </Button>
  );
}
