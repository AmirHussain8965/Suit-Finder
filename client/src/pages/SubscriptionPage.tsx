import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Check, Crown, Loader2, MapPin, MessageSquare, Calendar, Users, Shield, Globe } from "lucide-react";

const MONTHLY_PRICE_ID = "price_1St8wo2RfNP47wiLvi4rAalU";
const YEARLY_PRICE_ID = "price_1St8wo2RfNP47wiLMrxNFl2V";

export default function SubscriptionPage() {
  const { data: subscription, isLoading } = useSubscription();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);

  const handleSubscribe = async (priceId: string, plan: string) => {
    setIsCheckingOut(plan);
    try {
      const res = await apiRequest("POST", "/api/checkout", { priceId });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create checkout");
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
    setIsManaging(true);
    try {
      const res = await apiRequest("POST", "/api/customer-portal", {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to open portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsManaging(false);
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-accent" />
                    {subscription.plan === "platinum" ? "The Krug Society" : "The Tailored Circle"}
                  </CardTitle>
                  <CardDescription>
                    You have full access to all features
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent">
                  {subscription.plan === "yearly" ? "Annual" : "Monthly"} Plan
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
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={isManaging}
                data-testid="button-manage-subscription"
              >
                {isManaging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Manage Subscription
              </Button>
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
                    $9.99<span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <Button 
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => handleSubscribe(MONTHLY_PRICE_ID, "monthly")}
                    disabled={isCheckingOut !== null}
                    data-testid="button-subscribe-monthly"
                  >
                    {isCheckingOut === "monthly" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                    $12.99<span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <Button 
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => handleSubscribe(YEARLY_PRICE_ID, "yearly")}
                    disabled={isCheckingOut !== null}
                    data-testid="button-subscribe-yearly"
                  >
                    {isCheckingOut === "yearly" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Join The Krug Society
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Membership Benefits</CardTitle>
                <CardDescription>Everything included in paid tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
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
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Cancel anytime. Subscription will continue until the end of the billing period.
        </p>
      </div>
    </Layout>
  );
}
