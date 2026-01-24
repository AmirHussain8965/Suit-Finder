import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Shield, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <header className="flex-1 flex flex-col justify-center items-center text-center p-6 relative overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-background" />
          {/* unsplash: man adjusting tie in suit */}
          <img 
            src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1920&q=80" 
            alt="Gentleman in suit"
            className="w-full h-full object-cover grayscale"
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
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-light">
            Connect with fellow gentlemen who appreciate the art of fine dressing. 
            Share locations, organize meetups, and elevate your style.
          </p>

          <div className="pt-4">
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6 rounded-none font-serif tracking-wide"
              onClick={() => window.location.href = "/api/login"}
            >
              Enter the Lounge <ArrowRight className="ml-2 w-5 h-5" />
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
              description: "Join a network of individuals who share your passion for formal attire."
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
      </footer>
    </div>
  );
}
