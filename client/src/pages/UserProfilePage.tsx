import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { SuitedSilhouettes } from "@/components/SuitedSilhouettes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, MessageCircle, Loader2, ArrowLeft, User, Palette, Ruler, Activity, DoorOpen, Camera, X, ZoomIn, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ReportDialog } from "@/components/ReportDialog";
import { usePremiumFeature } from "@/hooks/use-subscription";

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


interface Photo {
  id: number;
  imageUrl: string;
  caption: string | null;
  isPublic: boolean;
  isProfilePhoto: boolean;
}

export default function UserProfilePage() {
  const [, params] = useRoute("/profile/:userId");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const userId = params?.userId;
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const { isPremium } = usePremiumFeature();

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

  const { data: photoAccessStatus } = useQuery<{ hasAccess: boolean }>({
    queryKey: [`/api/photo-access/check/${userId}`],
    enabled: !!userId,
  });

  const hasPrivatePhotoAccess = photoAccessStatus?.hasAccess === true;

  // Fetch public photos for all users, private photos only for those with access
  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: [`/api/photos/user/${userId}`],
    enabled: !!userId,
  });
  
  const publicPhotos = photos.filter(p => p.isPublic);
  const privatePhotos = photos.filter(p => !p.isPublic);

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
                  {hasWardrobeAccess && (
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/closet/${userId}`)}
                      data-testid="button-enter-closet"
                    >
                      <DoorOpen className="mr-2 h-4 w-4" />
                      Enter My Closet
                    </Button>
                  )}
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

          {/* Show photos to all users - public photos are always visible, private only with access */}
          {(publicPhotos.length > 0 || (hasPrivatePhotoAccess && privatePhotos.length > 0)) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <Camera className="h-5 w-5 text-accent" />
                  Photos
                  {hasPrivatePhotoAccess && privatePhotos.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      <Lock className="h-3 w-3 mr-1" />
                      Private Access
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Show public photos to everyone, private photos only to those with access */}
                  {[...publicPhotos, ...(hasPrivatePhotoAccess ? privatePhotos : [])].slice(0, 6).map((photo) => (
                    <div 
                      key={photo.id} 
                      className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group no-screenshot"
                      onClick={() => setSelectedPhoto(photo)}
                      data-testid={`photo-${photo.id}`}
                    >
                      <img 
                        src={photo.imageUrl} 
                        alt={photo.caption || "Photo"}
                        className="w-full h-full object-contain bg-black/20"
                      />
                      {!photo.isPublic && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="bg-black/70 text-white border-0">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
                {(publicPhotos.length + (hasPrivatePhotoAccess ? privatePhotos.length : 0)) > 6 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    +{(publicPhotos.length + (hasPrivatePhotoAccess ? privatePhotos.length : 0)) - 6} more photos
                  </p>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-border">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedPhoto(null)}
              data-testid="button-close-photo"
            >
              <X className="h-6 w-6" />
            </Button>
            {selectedPhoto && (
              <div className="flex flex-col">
                <div className="relative max-h-[80vh] flex items-center justify-center p-4">
                  <img
                    src={selectedPhoto.imageUrl}
                    alt={selectedPhoto.caption || "Photo"}
                    className="max-w-full max-h-[75vh] object-contain rounded-md no-screenshot"
                  />
                </div>
                {selectedPhoto.caption && (
                  <div className="p-4 bg-card border-t border-border">
                    <p className="text-muted-foreground text-sm text-center">
                      {selectedPhoto.caption}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
