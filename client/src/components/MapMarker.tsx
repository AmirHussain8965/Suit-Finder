import { Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plane } from "lucide-react";

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
  if (!user.latitude || !user.longitude) return null;

  return (
    <Marker 
      position={[user.latitude, user.longitude]} 
      icon={isSelf ? selfIcon : userIcon}
    >
      <Popup className="bg-card text-foreground border-border">
        <div className="flex flex-col items-center gap-2 p-2 min-w-[150px]">
          <Avatar className="h-12 w-12 border-2 border-accent">
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
            <button className="text-xs uppercase tracking-widest text-accent font-semibold mt-2 hover:underline">
              View Profile
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
