import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Lock, Gem } from "lucide-react";
import { useLocation } from "wouter";
import { usePremiumFeature, type SubscriptionTier } from "@/hooks/use-subscription";

interface PremiumGateProps {
  feature?: string;
  featureName?: string;
  description?: string;
  requiredTier?: 'premium' | 'platinum';
  children: React.ReactNode;
}

export function PremiumGate({ feature, featureName, description, requiredTier = 'premium', children }: PremiumGateProps) {
  const { isPremium, isPlatinum, tier, isLoading } = usePremiumFeature();
  const [, setLocation] = useLocation();
  const displayName = feature || featureName || 'This feature';

  if (isLoading) {
    return null;
  }

  const hasAccess = requiredTier === 'platinum' ? isPlatinum : isPremium;

  if (hasAccess) {
    return <>{children}</>;
  }

  const isPlatinumRequired = requiredTier === 'platinum';
  const Icon = isPlatinumRequired ? Gem : Lock;
  const tierLabel = isPlatinumRequired ? 'The Krug Society' : 'The Tailored Circle';
  const price = isPlatinumRequired ? '$12.99/month' : '$9.99/month';

  return (
    <Card className="border-dashed border-accent/50 max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto p-3 rounded-full bg-accent/10 w-fit mb-2">
          <Icon className="h-6 w-6 text-accent" />
        </div>
        <CardTitle className="text-lg">{displayName}</CardTitle>
        <CardDescription>
          {description || `This feature is available for ${tierLabel} members only.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => setLocation("/subscription")}
          data-testid="button-upgrade"
        >
          {isPlatinumRequired ? <Gem className="h-4 w-4 mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
          Upgrade to {tierLabel}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Starting at {price}
        </p>
      </CardContent>
    </Card>
  );
}

export function PlatinumGate({ feature, featureName, description, children }: Omit<PremiumGateProps, 'requiredTier'>) {
  return (
    <PremiumGate 
      feature={feature} 
      featureName={featureName} 
      description={description} 
      requiredTier="platinum"
    >
      {children}
    </PremiumGate>
  );
}

export function PremiumBadge() {
  const { isPremium, isPlatinum, tier } = usePremiumFeature();
  const [, setLocation] = useLocation();

  if (isPlatinum) {
    return (
      <div className="flex items-center gap-1 text-accent text-xs">
        <Gem className="h-3 w-3" />
        Krug Society
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="flex items-center gap-1 text-accent text-xs">
        <Crown className="h-3 w-3" />
        Tailored Circle
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
