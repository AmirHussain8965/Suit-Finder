import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { SuitedSilhouettes } from "@/components/SuitedSilhouettes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Loader2, ArrowLeft, User, Palette, Ruler, Activity, Shirt } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ReportDialog } from "@/components/ReportDialog";

interface UserProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  styleInterests: string | null;
  role: string | null;
  interestType: string | null;
  categories: unknown;
  hairColor: string | null;
  eyeColor: string | null;
  build: string | null;
  ethnicity: string | null;
  height: string | null;
  weight: string | null;
  bodyHair: string | null;
  hivStatus: string | null;
  onPrep: boolean | null;
  lastStdScreening: string | null;
}

interface WardrobeItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  imageUrl: string | null;
}

export default function UserProfilePage() {
  const [, params] = useRoute("/profile/:userId");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const userId = params?.userId;

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: [`/api/profiles/${userId}`],
    enabled: !!userId,
  });

  const { data: favorites = [] } = useQuery<{ userId: string }[]>({
    queryKey: ["/api/favorites"],
  });

  const { data: wardrobeAccessStatus } = useQuery<{ hasAccess: boolean }>({
    queryKey: [`/api/wardrobe-access/check/${userId}`],
    enabled: !!userId,
  });

  const hasWardrobeAccess = wardrobeAccessStatus?.hasAccess === true;

  const { data: wardrobe = [] } = useQuery<WardrobeItem[]>({
    queryKey: [`/api/profiles/${userId}/wardrobe`],
    enabled: !!userId && hasWardrobeAccess,
  });

  const isFavorited = favorites.some((f) => f.userId === userId);

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/favorites/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/favorites/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/conversations/direct/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation("/messages");
    },
  });

  const handleFavoriteClick = () => {
    if (isFavorited) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SuitedSilhouettes />
        <main className="md:ml-64 pb-20 md:pb-0">
          <div className="flex items-center justify-center h-[80vh]">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SuitedSilhouettes />
        <main className="md:ml-64 pb-20 md:pb-0">
          <div className="p-6 max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-serif font-bold text-foreground mb-4">Profile Not Found</h1>
            <p className="text-muted-foreground mb-6">This user's profile could not be found.</p>
            <Button onClick={() => setLocation("/map")} data-testid="button-back-to-map">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Map
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SuitedSilhouettes />
      
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="p-6 max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => setLocation("/map")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 border-4 border-accent mb-4 no-screenshot">
                  <AvatarImage src={profile.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-accent text-2xl font-serif">
                    {profile.displayName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                
                <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
                  {profile.displayName || "Unknown"}
                </h1>
                
                {profile.bio && (
                  <p className="text-muted-foreground mb-4 max-w-md">
                    {profile.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant={isFavorited ? "default" : "outline"}
                    onClick={handleFavoriteClick}
                    disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                    data-testid="button-favorite"
                  >
                    <Heart 
                      className={`mr-2 h-4 w-4 ${isFavorited ? "fill-current" : ""}`} 
                    />
                    {isFavorited ? "Favorited" : "Add to Favorites"}
                  </Button>
                  <Button
                    className="bg-accent text-accent-foreground"
                    onClick={() => startConversationMutation.mutate()}
                    disabled={startConversationMutation.isPending}
                    data-testid="button-message"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                  <ReportDialog 
                    userId={userId!} 
                    userName={profile?.displayName || undefined} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {profile.styleInterests && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <Palette className="h-5 w-5 text-accent" />
                  Style Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.styleInterests.split(',').map((interest, i) => (
                    <Badge key={i} variant="secondary">
                      {interest.trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(profile.role || profile.interestType) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <User className="h-5 w-5 text-accent" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {profile.role && (
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="font-medium capitalize">{profile.role}</p>
                    </div>
                  )}
                  {profile.interestType && (
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Type</p>
                      <p className="font-medium capitalize">{profile.interestType}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(profile.height || profile.weight || profile.build || profile.hairColor || profile.eyeColor) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <Ruler className="h-5 w-5 text-accent" />
                  Physical Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {profile.height && (
                    <div>
                      <p className="text-sm text-muted-foreground">Height</p>
                      <p className="font-medium">{profile.height}</p>
                    </div>
                  )}
                  {profile.weight && (
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{profile.weight}</p>
                    </div>
                  )}
                  {profile.build && (
                    <div>
                      <p className="text-sm text-muted-foreground">Build</p>
                      <p className="font-medium capitalize">{profile.build}</p>
                    </div>
                  )}
                  {profile.hairColor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Hair Color</p>
                      <p className="font-medium capitalize">{profile.hairColor}</p>
                    </div>
                  )}
                  {profile.eyeColor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Eye Color</p>
                      <p className="font-medium capitalize">{profile.eyeColor}</p>
                    </div>
                  )}
                  {profile.bodyHair && (
                    <div>
                      <p className="text-sm text-muted-foreground">Body Hair</p>
                      <p className="font-medium capitalize">{profile.bodyHair}</p>
                    </div>
                  )}
                  {profile.ethnicity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ethnicity</p>
                      <p className="font-medium capitalize">{profile.ethnicity}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(profile.hivStatus || profile.onPrep !== null) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <Activity className="h-5 w-5 text-accent" />
                  Health Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Self-reported and not verified
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {profile.hivStatus && (
                    <div>
                      <p className="text-sm text-muted-foreground">HIV Status</p>
                      <p className="font-medium capitalize">{profile.hivStatus}</p>
                    </div>
                  )}
                  {profile.onPrep !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground">On PrEP</p>
                      <p className="font-medium">{profile.onPrep ? "Yes" : "No"}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {hasWardrobeAccess && wardrobe.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <Shirt className="h-5 w-5 text-accent" />
                  Wardrobe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {wardrobe.slice(0, 6).map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-background rounded-lg border border-border p-3 no-screenshot"
                      data-testid={`wardrobe-item-${item.id}`}
                    >
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-24 object-cover rounded-md mb-2 pointer-events-none"
                        />
                      )}
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category.replace(/_/g, ' ')}</p>
                      {item.brand && (
                        <p className="text-xs text-accent">{item.brand}</p>
                      )}
                    </div>
                  ))}
                </div>
                {wardrobe.length > 6 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    +{wardrobe.length - 6} more items
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
