import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Shirt, Briefcase, Watch, Gem, Package, Star, Lock, X, ZoomIn } from "lucide-react";
import type { WardrobeItem } from "@/types";
import { wardrobeCategories } from "@/types";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

const categoryLabels: Record<string, string> = {
  suits: "Suits",
  jackets: "Jackets & Blazers",
  shirts: "Dress Shirts",
  ties: "Ties & Bowties",
  pocket_squares: "Pocket Squares",
  shoes: "Dress Shoes",
  belts: "Belts",
  watches: "Watches",
  cufflinks: "Cufflinks",
  accessories: "Accessories",
  pants: "Trousers",
  vests: "Vests & Waistcoats",
  overcoats: "Overcoats",
  other: "Other",
};

const getCategoryIcon = (category: string): LucideIcon => {
  switch (category) {
    case "suits":
    case "jackets":
    case "overcoats":
      return Briefcase;
    case "shirts":
    case "ties":
    case "vests":
      return Shirt;
    case "watches":
      return Watch;
    case "cufflinks":
    case "pocket_squares":
      return Gem;
    case "accessories":
      return Star;
    default:
      return Package;
  }
};

interface UserProfile {
  userId: string;
  displayName: string | null;
  profileImageUrl: string | null;
}

export default function UserClosetPage() {
  const [, params] = useRoute("/closet/:userId");
  const [, setLocation] = useLocation();
  const userId = params?.userId;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: [`/api/profiles/${userId}`],
    enabled: !!userId,
  });

  const { data: accessStatus, isLoading: accessLoading } = useQuery<{ hasAccess: boolean }>({
    queryKey: [`/api/wardrobe-access/check/${userId}`],
    enabled: !!userId,
  });

  const { data: allItems = [], isLoading: itemsLoading } = useQuery<WardrobeItem[]>({
    queryKey: [`/api/profiles/${userId}/wardrobe`],
    enabled: !!userId && accessStatus?.hasAccess === true,
  });

  const isLoading = profileLoading || accessLoading || itemsLoading;

  const filteredItems = selectedCategory 
    ? allItems.filter(item => item.category === selectedCategory)
    : allItems;

  if (isLoading) {
    return (
      <Layout backgroundVariant="wardrobe">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (!accessStatus?.hasAccess) {
    return (
      <Layout backgroundVariant="wardrobe">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You don't have access to view this closet.</p>
          <Button onClick={() => setLocation(`/profile/${userId}`)} data-testid="button-back-to-profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout backgroundVariant="wardrobe">
      <div className="flex flex-col h-full">
        <div className="p-4 md:p-6 border-b border-border bg-card">
          <div className="flex items-center gap-4 flex-wrap">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation(`/profile/${userId}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-10 w-10 border-2 border-accent">
                <AvatarImage src={profile?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-accent font-serif">
                  {profile?.displayName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-serif font-bold text-accent">
                  {profile?.displayName || "Member"}'s Closet
                </h1>
                <p className="text-muted-foreground text-sm">
                  {allItems.length} item{allItems.length !== 1 ? 's' : ''} in collection
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="filter-all"
                >
                  All ({allItems.length})
                </Button>
                {wardrobeCategories.map((cat) => {
                  const count = allItems.filter(i => i.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      data-testid={`filter-${cat}`}
                    >
                      {categoryLabels[cat]} ({count})
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Shirt className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Closet is Empty</h3>
              <p className="text-muted-foreground">This member hasn't added any items yet.</p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden group hover-elevate no-screenshot cursor-pointer"
                  data-testid={`closet-item-${item.id}`}
                  onClick={() => item.imageUrl && setSelectedItem(item)}
                >
                  <div className="relative aspect-square bg-muted">
                    {item.imageUrl ? (
                      <>
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    ) : (
                      (() => {
                        const IconComponent = getCategoryIcon(item.category);
                        return (
                          <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            <IconComponent className="h-12 w-12 text-muted-foreground" />
                          </div>
                        );
                      })()
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabels[item.category] || item.category}
                      </Badge>
                    </div>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{item.brand}</p>
                    )}
                    {item.color && (
                      <p className="text-xs text-muted-foreground truncate">{item.color}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
              <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                  onClick={() => setSelectedItem(null)}
                  data-testid="button-close-lightbox"
                >
                  <X className="h-6 w-6" />
                </Button>
                {selectedItem && (
                  <div className="flex flex-col">
                    <div className="relative max-h-[70vh] flex items-center justify-center p-4">
                      <img
                        src={selectedItem.imageUrl || ""}
                        alt={selectedItem.name}
                        className="max-w-full max-h-[65vh] object-contain rounded-md no-screenshot"
                      />
                    </div>
                    <div className="p-6 bg-card border-t border-border">
                      <h2 className="text-xl font-serif font-bold text-foreground mb-2">
                        {selectedItem.name}
                      </h2>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">
                          {categoryLabels[selectedItem.category] || selectedItem.category}
                        </Badge>
                        {selectedItem.brand && (
                          <Badge variant="outline">{selectedItem.brand}</Badge>
                        )}
                        {selectedItem.color && (
                          <Badge variant="outline">{selectedItem.color}</Badge>
                        )}
                      </div>
                      {selectedItem.description && (
                        <p className="text-muted-foreground text-sm">
                          {selectedItem.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
