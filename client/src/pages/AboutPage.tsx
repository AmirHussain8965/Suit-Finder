import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Crown, Check, MapPin, MessageSquare, Calendar, Users, 
  Shield, Shirt, Gavel, Heart, Eye, Lock
} from "lucide-react";

export default function AboutPage() {
  const gentlemansPassFeatures = [
    { icon: Eye, text: "Browse member profiles" },
    { icon: MapPin, text: "View the map" },
    { icon: Users, text: "Create your profile" },
    { icon: MessageSquare, text: "5 messages every 2 days" },
  ];

  const tailoredCircleFeatures = [
    { icon: MessageSquare, text: "Unlimited private messaging" },
    { icon: Heart, text: "Add members to favorites" },
    { icon: Users, text: "Create and join group chats" },
    { icon: Calendar, text: "Access events and meetups" },
    { icon: Shield, text: "Enhanced location privacy" },
    { icon: MapPin, text: "Multi-city roaming" },
  ];

  const krugSocietyFeatures = [
    { icon: Shirt, text: "Virtual wardrobe showcase" },
    { icon: Lock, text: "Private wardrobe access control" },
    { icon: Gavel, text: "Suit auction participation" },
    { icon: Crown, text: "Priority event access" },
  ];

  return (
    <Layout backgroundVariant="three-piece">
      <div className="p-6 max-w-4xl mx-auto space-y-10 pb-20">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif font-bold text-foreground">
            Welcome to Formal Findings
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A distinguished social network for men who appreciate the art of formal attire, 
            gentleman's fashion, and the refined pleasures of suits and tailored clothing.
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">What is Formal Findings?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Formal Findings is a location-based social platform designed exclusively for men 
              who share a passion for formal attire. Whether you're drawn to the elegance of 
              a perfectly tailored suit, the sophistication of a tuxedo, or simply appreciate 
              classic menswear style, this is your community.
            </p>
            <p>
              Our interactive map helps you discover like-minded gentlemen in your area, 
              while our messaging system lets you connect privately. Share your wardrobe, 
              attend exclusive events, and find others who understand your appreciation 
              for sartorial excellence.
            </p>
            <p>
              Your privacy is paramount. Locations are automatically fuzzed for safety, 
              and you control exactly who can see your profile, photos, and wardrobe.
            </p>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif font-bold text-foreground flex items-center justify-center gap-2">
            <Crown className="h-8 w-8 text-accent" />
            Membership Tiers
          </h2>
          <p className="text-muted-foreground">
            Choose the level of access that suits your style
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-serif">The Gentleman's Pass</CardTitle>
              <CardDescription>Free basic access</CardDescription>
              <div className="text-3xl font-bold text-accent pt-2">Free</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {gentlemansPassFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <feature.icon className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground italic pt-2">
                Perfect for exploring the community
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-accent/50">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-serif">The Tailored Circle</CardTitle>
              <CardDescription>Full social features</CardDescription>
              <div className="text-3xl font-bold text-accent pt-2">
                $9.99<span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Everything in Gentleman's Pass, plus:
              </p>
              <ul className="space-y-3">
                {tailoredCircleFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <feature.icon className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground italic pt-2">
                For active members ready to connect
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-accent relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-accent text-accent-foreground">Best Value</Badge>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-serif">The Krug Society</CardTitle>
              <CardDescription>Complete experience</CardDescription>
              <div className="text-3xl font-bold text-accent pt-2">
                $12.99<span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Everything in Tailored Circle, plus:
              </p>
              <ul className="space-y-3">
                {krugSocietyFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <feature.icon className="h-4 w-4 text-accent flex-shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground italic pt-2">
                The ultimate gentleman's experience
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-foreground">Feature</th>
                    <th className="text-center py-3 px-2 font-medium text-foreground">Gentleman's Pass</th>
                    <th className="text-center py-3 px-2 font-medium text-foreground">Tailored Circle</th>
                    <th className="text-center py-3 px-2 font-medium text-foreground">Krug Society</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2">Browse profiles & map</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2">Create profile & gallery</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2">Private messaging</td>
                    <td className="text-center py-3 px-2 text-muted-foreground text-xs">5 / 2 days</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2">Favorites list</td>
                    <td className="text-center py-3 px-2 text-muted-foreground/50">-</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2">Group chats</td>
                    <td className="text-center py-3 px-2 text-muted-foreground/50">-</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2">Events & meetups</td>
                    <td className="text-center py-3 px-2 text-muted-foreground/50">-</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2">Virtual wardrobe</td>
                    <td className="text-center py-3 px-2 text-muted-foreground/50">-</td>
                    <td className="text-center py-3 px-2 text-muted-foreground/50">-</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2">Suit auctions</td>
                    <td className="text-center py-3 px-2 text-muted-foreground/50">-</td>
                    <td className="text-center py-3 px-2 text-muted-foreground/50">-</td>
                    <td className="text-center py-3 px-2"><Check className="h-4 w-4 text-accent mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Code of Conduct</CardTitle>
            <CardDescription>Our community standards for a respectful experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Respect & Consent</h3>
                <p className="text-sm text-muted-foreground">
                  All interactions must be consensual. No means no. Respect boundaries at all times, 
                  both online and at in-person events. Harassment, stalking, or unwanted contact will 
                  result in immediate removal from the platform.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Age Requirement</h3>
                <p className="text-sm text-muted-foreground">
                  All members must be 21 years of age or older. Age verification is required upon 
                  registration. Any attempt to circumvent age verification or involve minors will 
                  result in permanent ban and may be reported to authorities.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Authentic Profiles</h3>
                <p className="text-sm text-muted-foreground">
                  Use only your own photos. Catfishing, impersonation, or misrepresentation is 
                  prohibited. Profile photos should accurately represent you.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Privacy & Discretion</h3>
                <p className="text-sm text-muted-foreground">
                  Do not share other members' photos, messages, or personal information outside the 
                  platform without their explicit consent. What happens in Formal Findings stays in 
                  Formal Findings.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">No Commercial Activity</h3>
                <p className="text-sm text-muted-foreground">
                  This is a social platform, not a marketplace for services. Solicitation of any 
                  kind is prohibited. The auction feature is for pre-owned formal attire only.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Safe Meetups</h3>
                <p className="text-sm text-muted-foreground">
                  When meeting in person, choose public locations for first meetings. Inform a 
                  trusted friend of your plans. Trust your instincts—if something feels off, leave. 
                  Practice safer sex and communicate openly about boundaries and health status.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Reporting Violations</h3>
                <p className="text-sm text-muted-foreground">
                  If you experience or witness any violation of this code of conduct, please report 
                  it immediately. All reports are taken seriously and investigated promptly. We 
                  reserve the right to remove any member who violates these standards.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                By using Formal Findings, you agree to abide by this Code of Conduct. Violations may 
                result in warnings, suspension, or permanent removal from the platform at our sole discretion.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Ready to join the community?
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-get-started">
              Get Started
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            You must be 21 or older to use Formal Findings
          </p>
        </div>
      </div>
    </Layout>
  );
}
