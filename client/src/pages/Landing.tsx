import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Shield, Users } from "lucide-react";
import { useLocation } from "wouter";
import heroImage from "../assets/images/hero-gentlemen.png";
import { SuitedSilhouettes } from "@/components/SuitedSilhouettes";

export default function Landing() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SuitedSilhouettes variant="minimal" />
      {/* Hero Section */}
      <header className="flex-1 flex flex-col justify-center items-center text-center p-6 relative overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-background" />
          <img 
            src={heroImage} 
            alt="Two gentlemen in three-piece suits"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="z-10 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-block border border-accent/30 rounded-full px-4 py-1.5 backdrop-blur-sm">
            <span className="text-accent text-sm tracking-widest uppercase font-medium">The Private Network</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-tight">
              Formal Findings <span className="text-accent italic">Search</span>
            </h1>
            <p className="text-2xl md:text-3xl font-serif text-accent italic tracking-wide">
              for men
            </p>
            <p className="text-lg md:text-xl text-muted-foreground mt-4 tracking-wide">
              Where presentation becomes personal
            </p>
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-light">
            A private social network for men who share a passion for formal attire and sartorial style. 
            Connect, explore, and discover like-minded gentlemen nearby.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6 rounded-none font-serif tracking-wide"
              onClick={() => setLocation("/auth")}
              data-testid="button-enter-lounge"
            >
              Enter the Lounge <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 rounded-none font-serif tracking-wide border-accent/50 hover:bg-accent/10"
              onClick={() => setLocation("/about")}
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="bg-card border-t border-border py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          {[
            {
              icon: MapPin,
              title: "Locate Enthusiasts",
              description: "Discover other tailored gentlemen in your vicinity with our private map."
            },
            {
              icon: Users,
              title: "Curated Community",
              description: "Join a private network of men who share your appreciation for suits, ties, and formal style."
            },
            {
              icon: Shield,
              title: "Private & Secure",
              description: "Your location is only shared when you choose to be visible."
            }
          ].map((feature, i) => (
            <div key={i} className="space-y-4 text-center md:text-left">
              <div className="inline-flex p-3 rounded-lg bg-primary/10 text-accent mb-2">
                <feature.icon size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2024 FORMAL FINDINGS. Elegance is not standing out, but being remembered.</p>
        <div className="mt-4 flex justify-center gap-4">
          <a href="/about" className="underline hover:text-accent" data-testid="link-footer-about">About</a>
          <a href="/privacy" className="underline hover:text-accent" data-testid="link-footer-privacy">Privacy Policy</a>
          <a href="/refund-policy" className="underline hover:text-accent" data-testid="link-footer-refund">Refund Policy</a>
        </div>
      </footer>
    </div>
  );
}
