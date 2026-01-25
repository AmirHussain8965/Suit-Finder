import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Check, Crown, Loader2, MapPin, MessageSquare, Calendar, Users, Shield, Globe, Shirt, Gavel } from "lucide-react";

export default function SubscriptionPage() {
  const { data: subscription, isLoading } = useSubscription();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

  const handleSubscribe = async (tier: 'premium' | 'platinum') => {
    setIsCheckingOut(tier);
    try {
      const res = await apiRequest("POST", "/api/checkout", { tier });
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

        {subscription?.isPremium ? (
          <Card className="border-accent">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-accent" />
                    {subscription.tier === "platinum" ? "The Krug Society" : "The Tailored Circle"}
                  </CardTitle>
                  <CardDescription>
                    You have full access to all features
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent">
                  {subscription.tier === "platinum" ? "Platinum" : "Premium"} Member
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Status: <span className="text-foreground capitalize">{subscription.status}</span>
              </p>
              {subscription.endDate && (
                <p className="text-sm text-muted-foreground">
                  Next billing: {new Date(subscription.endDate).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                To manage your subscription, please visit the CCBill customer portal or contact support.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Free Tier */}
              <Card className="relative">
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
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled
                    data-testid="button-current-plan"
                  >
                    Current Plan
                  </Button>
                </CardContent>
              </Card>

              {/* Tailored Circle */}
              <Card className="relative">
                <CardHeader>
                  <CardTitle>The Tailored Circle</CardTitle>
                  <CardDescription>Full messaging and events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    $19.99<span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> All free features</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Unlimited messaging</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> View member galleries</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Create events</li>
                  </ul>
                  <Button 
                    className="w-full bg-accent text-accent-foreground border-accent-border"
                    onClick={() => handleSubscribe('premium')}
                    disabled={isCheckingOut !== null}
                    data-testid="button-subscribe-premium"
                  >
                    {isCheckingOut === "premium" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Join The Tailored Circle
                  </Button>
                </CardContent>
              </Card>

              {/* Krug Society */}
              <Card className="relative border-accent">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground">Best Value</Badge>
                </div>
                <CardHeader>
                  <CardTitle>The Krug Society</CardTitle>
                  <CardDescription>All features plus wardrobe and auctions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    $49.99<span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> All Tailored Circle features</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Virtual wardrobe</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Suit auctions access</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Exclusive events</li>
                  </ul>
                  <Button 
                    className="w-full bg-accent text-accent-foreground border-accent-border"
                    onClick={() => handleSubscribe('platinum')}
                    disabled={isCheckingOut !== null}
                    data-testid="button-subscribe-platinum"
                  >
                    {isCheckingOut === "platinum" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Join The Krug Society
                  </Button>
                </CardContent>
              </Card>
            </div>

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
          Payments are processed securely through CCBill. Cancel anytime. Subscription will continue until the end of the billing period.
        </p>
      </div>
    </Layout>
  );
}
