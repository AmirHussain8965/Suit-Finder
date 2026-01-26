import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Loader2, MapPin, MessageSquare, Calendar, Users, Shield, Globe, Shirt, Gavel, ExternalLink, LogOut, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

type StripePrice = {
  id: string;
  amount: number;
  currency: string;
  interval: string;
};

type StripeProduct = {
  id: string;
  name: string;
  description: string;
  tier: string;
  features: string[];
  prices: StripePrice[];
};

export default function SubscriptionPage() {
  const { data: subscription, isLoading } = useSubscription();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      setIsLoggingOut(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await apiRequest("DELETE", "/api/account");
      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
      setIsDeletingAccount(false);
    }
  };

  const { data: pricesData } = useQuery<{ prices: StripeProduct[] }>({
    queryKey: ['/api/prices'],
  });

  const handleSubscribe = async (priceId: string, productId: string) => {
    setIsCheckingOut(productId);
    try {
      const res = await apiRequest("POST", "/api/checkout", { priceId });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Failed to create checkout");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsCheckingOut(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await apiRequest("POST", "/api/billing/portal", {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Failed to open billing portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsOpeningPortal(false);
    }
  };

  // Find the correct products by tier and price (The Tailored Circle should be $9.99, Krug Society should be $12.99)
  const premiumProduct = pricesData?.prices?.find(p => 
    p.tier === 'premium' && 
    p.name === 'The Tailored Circle' && 
    p.prices.some(pr => pr.amount === 999 && pr.interval === 'month')
  );
  const platinumProduct = pricesData?.prices?.find(p => 
    p.tier === 'platinum' && 
    p.name === 'The Krug Society' && 
    p.prices.some(pr => pr.amount === 1299 && pr.interval === 'month')
  );

  const premiumFeatures = [
    { icon: MessageSquare, title: "Unlimited Messaging", description: "Send and receive private messages" },
    { icon: Users, title: "Group Chats", description: "Create and join group conversations" },
    { icon: Calendar, title: "Events Access", description: "Create, join and manage events" },
    { icon: Shield, title: "Location Privacy", description: "Blur your exact location for safety" },
    { icon: Globe, title: "Multi-City Roaming", description: "Appear in multiple cities" },
    { icon: MapPin, title: "Full Map Access", description: "See all nearby members" },
  ];

  const platinumFeatures = [
    { icon: Shirt, title: "Virtual Wardrobe", description: "Showcase your formal attire collection" },
    { icon: Gavel, title: "Suit Auctions", description: "Buy and sell premium formal wear" },
    { icon: Crown, title: "Priority Support", description: "Dedicated support channel" },
    { icon: Calendar, title: "Exclusive Events", description: "Access to VIP-only gatherings" },
  ];

  if (isLoading) {
    return (
      <Layout backgroundVariant="three-piece">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout backgroundVariant="three-piece">
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center justify-center gap-2">
            <Crown className="h-8 w-8 text-accent" />
            Membership Tiers
          </h1>
          <p className="text-muted-foreground">
            Choose your level of access to the gentleman's community
          </p>
        </div>

        {/* Always show tier selection grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <Card className={`relative ${!subscription?.isPremium ? 'border-accent' : ''}`}>
            {!subscription?.isPremium && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground">Current</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>The Gentleman's Pass</CardTitle>
              <CardDescription>Free basic access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                Free
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Browse profiles</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> View map</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Create profile</li>
              </ul>
              {!subscription?.isPremium ? (
                <Button 
                  variant="outline"
                  className="w-full"
                  disabled
                  data-testid="button-current-plan-free"
                >
                  Current Plan
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={isOpeningPortal}
                  data-testid="button-downgrade-free"
                >
                  {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Manage Plan
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Tailored Circle */}
          <Card className={`relative ${subscription?.isPremium && subscription.tier === 'premium' ? 'border-accent' : ''}`}>
            {subscription?.isPremium && subscription.tier === 'premium' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground">Current</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>{premiumProduct?.name || "The Tailored Circle"}</CardTitle>
              <CardDescription>Full messaging and events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                $9.99
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> All free features</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Unlimited messaging</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> View member galleries</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Create events</li>
              </ul>
              {subscription?.isPremium && subscription.tier === 'premium' ? (
                <Button 
                  variant="outline"
                  className="w-full"
                  disabled
                  data-testid="button-current-plan-premium"
                >
                  Current Plan
                </Button>
              ) : subscription?.isPremium && subscription.tier === 'platinum' ? (
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={isOpeningPortal}
                  data-testid="button-change-to-premium"
                >
                  {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Manage Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-accent text-accent-foreground border-accent-border"
                  onClick={() => {
                    const monthlyPrice = premiumProduct?.prices.find(p => p.interval === 'month' && p.amount === 999);
                    if (monthlyPrice && premiumProduct) handleSubscribe(monthlyPrice.id, premiumProduct.id);
                  }}
                  disabled={isCheckingOut !== null || !premiumProduct?.prices.find(p => p.interval === 'month' && p.amount === 999)}
                  data-testid="button-subscribe-premium"
                >
                  {isCheckingOut === premiumProduct?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Join The Tailored Circle
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Krug Society */}
          <Card className={`relative ${subscription?.isPremium && subscription.tier === 'platinum' ? 'border-accent' : !subscription?.isPremium ? 'border-accent/50' : ''}`}>
            {subscription?.isPremium && subscription.tier === 'platinum' ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground">Current</Badge>
              </div>
            ) : (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground">Best Value</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>{platinumProduct?.name || "The Krug Society"}</CardTitle>
              <CardDescription>All features plus wardrobe and auctions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                $12.99
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> All Tailored Circle features</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Virtual wardrobe</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Suit auctions access</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Exclusive events</li>
              </ul>
              {subscription?.isPremium && subscription.tier === 'platinum' ? (
                <Button 
                  variant="outline"
                  className="w-full"
                  disabled
                  data-testid="button-current-plan-platinum"
                >
                  Current Plan
                </Button>
              ) : subscription?.isPremium && subscription.tier === 'premium' ? (
                <Button 
                  className="w-full bg-accent text-accent-foreground border-accent-border"
                  onClick={() => {
                    const monthlyPrice = platinumProduct?.prices.find(p => p.interval === 'month' && p.amount === 1299);
                    if (monthlyPrice && platinumProduct) handleSubscribe(monthlyPrice.id, platinumProduct.id);
                  }}
                  disabled={isCheckingOut !== null || !platinumProduct?.prices.find(p => p.interval === 'month' && p.amount === 1299)}
                  data-testid="button-upgrade-platinum"
                >
                  {isCheckingOut === platinumProduct?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Upgrade to Krug Society
                </Button>
              ) : (
                <Button 
                  className="w-full bg-accent text-accent-foreground border-accent-border"
                  onClick={() => {
                    const monthlyPrice = platinumProduct?.prices.find(p => p.interval === 'month' && p.amount === 1299);
                    if (monthlyPrice && platinumProduct) handleSubscribe(monthlyPrice.id, platinumProduct.id);
                  }}
                  disabled={isCheckingOut !== null || !platinumProduct?.prices.find(p => p.interval === 'month' && p.amount === 1299)}
                  data-testid="button-subscribe-platinum"
                >
                  {isCheckingOut === platinumProduct?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Join The Krug Society
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscription management section for existing subscribers */}
        {subscription?.isPremium && (
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Current plan: <span className="text-foreground font-medium">{subscription.tier === "platinum" ? "The Krug Society" : "The Tailored Circle"}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="text-foreground capitalize">{subscription.status}</span>
                    {subscription.endDate && (
                      <> • Next billing: {new Date(subscription.endDate).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleManageSubscription}
                  disabled={isOpeningPortal}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-manage-subscription"
                >
                  {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!subscription?.isPremium && (
          <>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    Tailored Circle Benefits
                  </CardTitle>
                  <CardDescription>Everything included in premium tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {premiumFeatures.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent">
                          <feature.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-accent" />
                    Krug Society Extras
                  </CardTitle>
                  <CardDescription>Additional platinum-only features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {platinumFeatures.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent">
                          <feature.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Payments are processed securely through Stripe. Cancel anytime. Subscription will continue until the end of the billing period.
          <br />
          <a href="/refund-policy" className="underline hover:text-accent" data-testid="link-refund-policy">
            View Refund & Cancellation Policy
          </a>
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-2"
            data-testid="button-logout"
          >
            {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Log Out
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isDeletingAccount}
                data-testid="button-delete-account"
              >
                {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Profile
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data including your profile, photos, messages, favorites,
                  wardrobe items, and event participation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Layout>
  );
}
