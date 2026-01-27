import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { SuitedSilhouettes } from "@/components/SuitedSilhouettes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Loader2, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import favoritesHero from "@/assets/images/favorites-hero.png";

interface FavoriteUser {
  userId: string;
  displayName: string | null;
  profileImageUrl: string | null;
}

export default function FavoritesPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery<FavoriteUser[]>({
    queryKey: ["/api/favorites"],
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/favorites/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/conversations/direct/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation("/messages");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SuitedSilhouettes />
      
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img 
            src={favoritesHero} 
            alt="Elegant gentleman in pinstripe suit" 
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500 fill-red-500" />
              Favorites
            </h1>
            <p className="text-muted-foreground mt-1">
              Gentlemen you've marked as favorites
            </p>
          </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto">

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : favorites.length === 0 ? (
            <Card className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                No favorites yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Tap the heart icon on someone's profile to add them to your favorites.
              </p>
              <Button 
                onClick={() => setLocation("/map")}
                className="bg-accent text-accent-foreground"
                data-testid="button-explore-map"
              >
                Explore the Map
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((favorite) => (
                <Card 
                  key={favorite.userId} 
                  className="p-4 flex items-center gap-4 hover-elevate"
                  data-testid={`card-favorite-${favorite.userId}`}
                >
                  <div 
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                    onClick={() => setLocation(`/profile/${favorite.userId}`)}
                    data-testid={`link-favorite-profile-${favorite.userId}`}
                  >
                    <Avatar className="h-14 w-14 border-2 border-accent">
                      <AvatarImage src={favorite.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-accent font-serif">
                        {favorite.displayName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-semibold text-foreground truncate hover:text-accent transition-colors">
                        {favorite.displayName || "Unknown"}
                      </h3>
                      <p className="text-xs text-muted-foreground">Click to view profile</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startConversationMutation.mutate(favorite.userId)}
                      disabled={startConversationMutation.isPending}
                      data-testid={`button-message-favorite-${favorite.userId}`}
                    >
                      <MessageCircle className="h-5 w-5 text-accent" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFavoriteMutation.mutate(favorite.userId)}
                      disabled={removeFavoriteMutation.isPending}
                      data-testid={`button-unfavorite-${favorite.userId}`}
                    >
                      <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
