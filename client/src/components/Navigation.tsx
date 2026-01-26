import { Link, useLocation } from "wouter";
import { Map, User, Image, LogOut, MessageSquare, Calendar, Crown, Shirt, Gavel, Heart, Info, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { usePremiumFeature } from "@/hooks/use-subscription";

export function Navigation() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { isPremium } = usePremiumFeature();

  const isActive = (path: string) => location === path;

  const navItems = [
    { href: "/map", icon: Map, label: "Explore" },
    { href: "/whos-on", icon: Users, label: "Who's On" },
    { href: "/favorites", icon: Heart, label: "Favorites" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/wardrobe", icon: Shirt, label: "Wardrobe" },
    { href: "/auctions", icon: Gavel, label: "Auctions" },
    { href: "/gallery", icon: Image, label: "Gallery" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 border-r border-border bg-card fixed inset-y-0 z-50">
        <div className="p-8">
          <h1 className="text-2xl font-serif font-bold text-accent tracking-wider">
            SARTORIAL
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            Gentleman's Finder
          </p>
        </div>

        <div className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`
                flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300
                ${isActive(item.href) 
                  ? "bg-primary/20 text-accent border-l-2 border-accent" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}
              `}
              data-testid={`link-nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <Link href="/about" className={`
            flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300
            ${isActive("/about") 
              ? "bg-primary/20 text-accent border-l-2 border-accent" 
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}
          `}
          data-testid="link-nav-about"
          >
            <Info size={20} />
            <span className="font-medium">About</span>
          </Link>
          <Link href="/subscription" className={`
            flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300
            ${isPremium 
              ? "bg-accent/10 text-accent" 
              : "text-accent hover:bg-accent/10"}
          `}>
            <Crown size={20} />
            <span className="font-medium">{isPremium ? "Member" : "Upgrade"}</span>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
            onClick={() => logout()}
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`
                flex flex-col items-center justify-center w-full h-full space-y-1
                ${isActive(item.href) ? "text-accent" : "text-muted-foreground"}
              `}
              data-testid={`link-mobile-nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={() => logout()}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground"
            data-testid="button-mobile-logout"
          >
            <LogOut size={20} />
            <span className="text-[10px] uppercase tracking-wider">Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
