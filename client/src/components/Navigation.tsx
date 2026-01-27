import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Map, User, Image, LogOut, MessageSquare, Calendar, Crown, Shirt, Gavel, Heart, Info, Users, Shield, MoreHorizontal, X, Trash2, Wine } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { usePremiumFeature } from "@/hooks/use-subscription";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function Navigation() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { isPremium, isAdmin } = usePremiumFeature();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isActive = (path: string) => location === path;

  // Primary nav items shown in mobile bottom bar
  const primaryNavItems = [
    { href: "/map", icon: Map, label: "Explore" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/favorites", icon: Heart, label: "Favorites" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  // All nav items for desktop sidebar
  const allNavItems = [
    { href: "/map", icon: Map, label: "Explore" },
    { href: "/whos-on", icon: Users, label: "Who's On" },
    { href: "/soiree", icon: Wine, label: "The Lounge" },
    { href: "/favorites", icon: Heart, label: "Favorites" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/wardrobe", icon: Shirt, label: "Wardrobe" },
    { href: "/auctions", icon: Gavel, label: "Auctions" },
    { href: "/gallery", icon: Image, label: "Gallery" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  // Secondary items shown in "More" menu on mobile
  const moreMenuItems = [
    { href: "/whos-on", icon: Users, label: "Who's On" },
    { href: "/soiree", icon: Wine, label: "The Lounge" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/wardrobe", icon: Shirt, label: "Wardrobe" },
    { href: "/auctions", icon: Gavel, label: "Auctions" },
    { href: "/gallery", icon: Image, label: "Gallery" },
    { href: "/subscription", icon: Crown, label: isPremium ? "Membership" : "Upgrade" },
    { href: "/about", icon: Info, label: "About" },
  ];

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE", credentials: "include" });
      if (response.ok) {
        window.location.href = "/";
      } else {
        console.error("Delete account failed:", response.status);
        setIsDeleting(false);
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Delete account error:", error);
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

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
          {allNavItems.map((item) => (
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
          {isAdmin && (
            <Link href="/admin" className={`
              flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300
              ${isActive("/admin") 
                ? "bg-primary/20 text-accent border-l-2 border-accent" 
                : "text-amber-500 hover:bg-amber-500/10"}
            `}
            data-testid="link-nav-admin"
            >
              <Shield size={20} />
              <span className="font-medium">Admin</span>
            </Link>
          )}
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

      {/* Mobile Bottom Bar - Simplified with More menu */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
        <div className="flex justify-around items-center h-16 pb-safe">
          {primaryNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`
                flex flex-col items-center justify-center flex-1 h-full space-y-1
                ${isActive(item.href) ? "text-accent" : "text-muted-foreground"}
              `}
              data-testid={`link-mobile-nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-muted-foreground"
            data-testid="button-mobile-more"
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] uppercase tracking-wider">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Menu Dialog */}
      <Dialog open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-accent">Menu</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {moreMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-md transition-all
                  ${isActive(item.href) 
                    ? "bg-accent/20 text-accent" 
                    : "text-foreground hover:bg-muted"}
                `}
                data-testid={`link-mobile-more-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-md transition-all text-amber-500 hover:bg-amber-500/10"
                data-testid="link-mobile-more-admin"
              >
                <Shield size={20} />
                <span className="font-medium">Admin</span>
              </Link>
            )}

            <div className="border-t border-border my-2" />
            
            <button
              onClick={() => {
                setMoreMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-md transition-all text-muted-foreground hover:text-red-400 hover:bg-red-400/10 w-full text-left"
              data-testid="button-mobile-more-logout"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>

            <button
              onClick={() => {
                setMoreMenuOpen(false);
                setDeleteDialogOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-md transition-all text-red-500 hover:bg-red-500/10 w-full text-left"
              data-testid="button-mobile-more-delete"
            >
              <Trash2 size={20} />
              <span className="font-medium">Delete Account</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your account, profile, photos, and all data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
