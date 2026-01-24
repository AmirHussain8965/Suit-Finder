import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useProfile, useNearbyProfiles, useUpdateLocation } from "@/hooks/use-profiles";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { MapMarker } from "@/components/MapMarker";
import { Button } from "@/components/ui/button";
import { Crosshair, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

// Helper to recenter map
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapPage() {
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { mutate: updateLocation, isPending: isUpdatingLocation } = useUpdateLocation();
  const { toast } = useToast();
  const [isLocating, setIsLocating] = useState(false);
  
  // Local state for user's viewport center (defaults to profile location or a default)
  const [center, setCenter] = useState<[number, number]>([51.505, -0.09]); // London default
  const [zoom] = useState(13);

  // Fetch nearby profiles based on current center
  const { data: nearbyUsers } = useNearbyProfiles(center[0], center[1], 50); // 50km radius

  // Sync center with profile once loaded if available
  useEffect(() => {
    if (profile?.latitude && profile?.longitude) {
      setCenter([profile.latitude, profile.longitude]);
    } else {
      // If no profile location, try to geolocate immediately
      handleLocateMe();
    }
  }, [profile?.latitude, profile?.longitude]);

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return;
    }

    setIsLocating(true);
    toast({
      title: "Finding your location...",
      description: "Please allow location access if prompted.",
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCenter([latitude, longitude]);
        updateLocation({ 
          latitude, 
          longitude,
          physicalLatitude: latitude,
          physicalLongitude: longitude
        } as any, {
          onSuccess: () => {
            setIsLocating(false);
            toast({
              title: "Location updated!",
              description: "Your pin has been moved to your current location.",
            });
          },
          onError: () => {
            setIsLocating(false);
            toast({
              title: "Update failed",
              description: "Could not save your location. Please try again.",
              variant: "destructive",
            });
          }
        });
      },
      (error) => {
        setIsLocating(false);
        let message = "Could not get your location.";
        if (error.code === 1) message = "Location permission denied. Please allow access in your browser settings.";
        if (error.code === 2) message = "Location unavailable. Please try again.";
        if (error.code === 3) message = "Location request timed out. Please try again.";
        
        toast({
          title: "Location error",
          description: message,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (isProfileLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  // If user has no profile yet (shouldn't happen with correct routing, but safe guard)
  if (!profile) return null;

  return (
    <Layout>
      <div className="relative flex-1 w-full bg-background min-h-0">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          {/* High contrast dark themed tiles for better readability */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
          />

          <RecenterMap lat={center[0]} lng={center[1]} />

          {/* Render Me */}
          {profile.latitude && profile.longitude && (
            <MapMarker 
              user={{
                userId: profile.userId,
                displayName: profile.displayName,
                latitude: profile.latitude,
                longitude: profile.longitude,
                bio: profile.bio,
                profileImageUrl: null, // We'll need to fetch this from auth eventually if stored there
              }} 
              isSelf 
            />
          )}

          {/* Render Others */}
          {nearbyUsers?.map((user) => (
            user.userId !== profile.userId && (
              <MapMarker key={user.userId} user={user} />
            )
          ))}
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <Button
            size="icon"
            onClick={handleLocateMe}
            disabled={isUpdatingLocation || isLocating}
            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl rounded-full h-14 w-14 border-2 border-white"
            data-testid="button-locate-me"
          >
            {(isUpdatingLocation || isLocating) ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Crosshair className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Status Bar Overlay */}
        <div className="absolute bottom-6 left-6 right-6 z-[400] md:left-auto md:w-96">
          <div className="bg-card/90 backdrop-blur-md border border-border p-4 rounded-lg shadow-xl">
            <h3 className="font-serif font-bold text-lg text-accent mb-1">
              {profile.displayName || "Sartorial Member"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {profile.isVisible 
                ? "You are visible to other members nearby." 
                : "You are currently hidden from the map."}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
