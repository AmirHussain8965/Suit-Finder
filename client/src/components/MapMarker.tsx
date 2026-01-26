import { Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plane, Heart, MessageCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Custom marker icons
const userIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const selfIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MapMarkerProps {
  user: {
    userId: string;
    displayName: string | null;
    latitude: number | null;
    longitude: number | null;
    bio: string | null;
    profileImageUrl: string | null;
    isTraveling?: boolean;
  };
  isSelf?: boolean;
}

export function MapMarker({ user, isSelf = false }: MapMarkerProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery<{ userId: string }[]>({
    queryKey: ["/api/favorites"],
  });

  const isFavorited = favorites.some((f) => f.userId === user.userId);

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/favorites/${user.userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/favorites/${user.userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/conversations/direct/${user.userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation("/messages");
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorited) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startConversationMutation.mutate();
  };

  if (!user.latitude || !user.longitude) return null;

  return (
    <Marker 
      position={[user.latitude, user.longitude]} 
      icon={isSelf ? selfIcon : userIcon}
    >
      <Popup className="bg-card text-foreground border-border">
        <div className="flex flex-col items-center gap-2 p-2 min-w-[150px]">
          <Avatar className="h-12 w-12 border-2 border-accent no-screenshot">
            <AvatarImage src={user.profileImageUrl || undefined} />
            <AvatarFallback>{user.displayName?.[0] || "?"}</AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <h3 className="font-serif font-bold text-lg text-foreground">
                {isSelf ? "You" : user.displayName || "Unknown User"}
              </h3>
              {user.isTraveling && (
                <Plane className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            {user.bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                "{user.bio}"
              </p>
            )}
          </div>
          
          {!isSelf && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleFavoriteClick}
                  disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                  data-testid={`button-favorite-${user.userId}`}
                >
                  <Heart 
                    className={`h-5 w-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} 
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleMessageClick}
                  disabled={startConversationMutation.isPending}
                  data-testid={`button-message-${user.userId}`}
                >
                  <MessageCircle className="h-5 w-5 text-accent" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs uppercase tracking-widest text-accent font-semibold"
                onClick={() => setLocation(`/profile/${user.userId}`)}
                data-testid={`button-view-profile-${user.userId}`}
              >
                View Profile
              </Button>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
