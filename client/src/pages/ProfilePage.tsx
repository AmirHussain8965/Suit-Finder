import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProfileSchema } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Users, X, Plus, Lock, Camera, Check } from "lucide-react";
import { useMyPhotos, useSetProfilePhoto } from "@/hooks/use-photos";
import type { Photo } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema for the form - allow partial updates but require displayName
const profileFormSchema = insertProfileSchema.partial().extend({
  displayName: z.string()
    .min(2, "Display name must be at least 2 characters")
    .refine(
      (val) => val.toLowerCase() !== "unknown" && val !== "?",
      "Please choose a proper display name"
    ),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

type WardrobeAccessUser = {
  id: number;
  grantedUserId: string;
  displayName: string;
  profileImageUrl: string | null;
  createdAt: string;
};

type PhotoAccessUser = {
  id: number;
  grantedUserId: string;
  displayName: string;
  profileImageUrl: string | null;
  createdAt: string;
};

type FavoriteUser = {
  userId: string;
  displayName: string;
  profileImageUrl: string | null;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [wardrobeDialogOpen, setWardrobeDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [profilePicDialogOpen, setProfilePicDialogOpen] = useState(false);
  const [settingPhotoId, setSettingPhotoId] = useState<number | null>(null);

  // Photo gallery for profile picture selection
  const { data: myPhotos = [], isLoading: isPhotosLoading, isError: isPhotosError, refetch: refetchPhotos } = useMyPhotos();
  const { mutate: setProfilePhoto, isPending: isSettingProfilePhoto } = useSetProfilePhoto();

  // Wardrobe access queries
  const { data: wardrobeAccessList = [] } = useQuery<WardrobeAccessUser[]>({
    queryKey: ["/api/wardrobe-access"],
  });

  const { data: favorites = [] } = useQuery<FavoriteUser[]>({
    queryKey: ["/api/favorites"],
  });

  const grantAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/wardrobe-access/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobe-access"] });
      toast({ title: "Access granted" });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/wardrobe-access/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobe-access"] });
      toast({ title: "Access revoked" });
    },
  });

  // Photo access queries
  const { data: photoAccessList = [] } = useQuery<PhotoAccessUser[]>({
    queryKey: ["/api/photo-access"],
  });

  const grantPhotoAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/photo-access/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photo-access"] });
      toast({ title: "Photo access granted" });
    },
  });

  const revokePhotoAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/photo-access/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photo-access"] });
      toast({ title: "Photo access revoked" });
    },
  });

  // Get favorites that don't already have photo access
  const availableToGrantPhoto = favorites.filter(
    (fav) => !photoAccessList.some((access) => access.grantedUserId === fav.userId)
  );

  // Get favorites that don't already have access
  const availableToGrant = favorites.filter(
    (fav) => !wardrobeAccessList.some((access) => access.grantedUserId === fav.userId)
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      styleInterests: "",
      role: "",
      interestType: "",
      categories: [],
      isVisible: true,
      isTraveling: false,
      hairColor: "",
      eyeColor: "",
      build: "",
      ethnicity: "",
      height: "",
      weight: "",
      bodyHair: "",
    },
  });

  // Load existing profile data into form
  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || user?.firstName || "",
        bio: profile.bio || "",
        styleInterests: profile.styleInterests || "",
        role: profile.role || "",
        interestType: profile.interestType || "",
        categories: profile.categories || [],
        isVisible: profile.isVisible ?? true,
        isTraveling: profile.isTraveling ?? false,
        hairColor: profile.hairColor || "",
        eyeColor: profile.eyeColor || "",
        build: profile.build || "",
        ethnicity: profile.ethnicity || "",
        height: profile.height || "",
        weight: profile.weight || "",
        bodyHair: profile.bodyHair || "",
      });
    }
  }, [profile, user, form]);

  const mainSuitTypes = ["Tuxedo", "Suit and Tie"];

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile(data, {
      onSuccess: () => {
        toast({
          title: "Profile Updated",
          description: "Your sartorial identity has been refreshed.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  if (isProfileLoading) {
    return (
      <Layout backgroundVariant="three-piece">
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout backgroundVariant="three-piece">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start border-b border-border pb-8">
          <button
            type="button"
            onClick={() => setProfilePicDialogOpen(true)}
            className="relative group cursor-pointer"
            data-testid="button-change-profile-pic"
          >
            <Avatar className="h-32 w-32 border-4 border-card shadow-xl ring-2 ring-accent/50 transition-all group-hover:ring-accent">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-4xl bg-primary text-accent">
                {profile?.displayName?.[0] || user?.firstName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground rounded-full p-1.5 shadow-lg">
              <Camera className="h-4 w-4" />
            </div>
          </button>
          
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-4xl font-serif font-bold text-foreground">
              {profile?.displayName || user?.firstName || "Member"}
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Manage your public appearance and preferences within the network.
            </p>
            <p className="text-xs text-muted-foreground">
              Click your photo to change it
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Main Info */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-accent">Personal Details</CardTitle>
                <CardDescription>How others see you on the map.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    {...form.register("displayName")} 
                    className="bg-background border-input focus:border-accent"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    {...form.register("bio")} 
                    className="bg-background border-input focus:border-accent min-h-[100px]"
                    placeholder="E.g. Vintage tuxedo collector, black tie enthusiast..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <Input 
                      id="height" 
                      {...form.register("height")} 
                      className="bg-background border-input focus:border-accent"
                      placeholder="5'10&quot; or 178cm"
                      data-testid="input-height"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input 
                      id="weight" 
                      {...form.register("weight")} 
                      className="bg-background border-input focus:border-accent"
                      placeholder="180lbs or 82kg"
                      data-testid="input-weight"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-accent">Style & Privacy</CardTitle>
                <CardDescription>Your interests and visibility settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="styleInterests">Style Interests (comma separated)</Label>
                  <Input 
                    id="styleInterests" 
                    {...form.register("styleInterests")} 
                    className="bg-background border-input focus:border-accent"
                    placeholder="Black Tie, Morning Dress, Velvet Jackets..."
                  />
                </div>

                <div className="space-y-3">
                  <Label>Primary Focus</Label>
                  <div className="flex gap-4">
                    {mainSuitTypes.map((type) => {
                      const currentInterests = form.watch("styleInterests")?.split(", ").filter(Boolean) || [];
                      const isChecked = currentInterests.includes(type);
                      
                      return (
                        <label key={type} className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border bg-background/50 flex-1 justify-center hover-elevate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newInterests = e.target.checked 
                                ? [...currentInterests, type]
                                : currentInterests.filter(i => i !== type);
                              form.setValue("styleInterests", newInterests.join(", "));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                          />
                          <span className="text-sm font-medium">{type}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Visible on Map</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow other members to see your location
                    </p>
                  </div>
                  <Switch 
                    checked={form.watch("isVisible") ?? false}
                    onCheckedChange={(checked) => form.setValue("isVisible", checked)}
                    className="data-[state=checked]:bg-accent"
                    data-testid="switch-visible-on-map"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-accent" />
                      Wardrobe Access
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {wardrobeAccessList.length === 0 
                        ? "No one has access to your wardrobe"
                        : `${wardrobeAccessList.length} member${wardrobeAccessList.length !== 1 ? 's' : ''} can view`}
                    </p>
                  </div>
                  <Dialog open={wardrobeDialogOpen} onOpenChange={setWardrobeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-manage-wardrobe-access">
                        <Users className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-accent">Wardrobe Access</DialogTitle>
                        <DialogDescription>
                          Choose who can view your virtual wardrobe. Only selected members will have access.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {wardrobeAccessList.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Members with Access</Label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {wardrobeAccessList.map((access) => (
                                <div 
                                  key={access.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={access.profileImageUrl || undefined} />
                                      <AvatarFallback className="bg-accent/20 text-accent text-xs">
                                        {access.displayName?.charAt(0)?.toUpperCase() || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{access.displayName}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => revokeAccessMutation.mutate(access.grantedUserId)}
                                    disabled={revokeAccessMutation.isPending}
                                    data-testid={`button-revoke-access-${access.grantedUserId}`}
                                  >
                                    <X className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {availableToGrant.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Add from Favorites</Label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {availableToGrant.map((fav) => (
                                <div 
                                  key={fav.userId}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={fav.profileImageUrl || undefined} />
                                      <AvatarFallback className="bg-accent/20 text-accent text-xs">
                                        {fav.displayName?.charAt(0)?.toUpperCase() || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{fav.displayName}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => grantAccessMutation.mutate(fav.userId)}
                                    disabled={grantAccessMutation.isPending}
                                    data-testid={`button-grant-access-${fav.userId}`}
                                  >
                                    <Plus className="w-4 h-4 text-accent" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {wardrobeAccessList.length === 0 && availableToGrant.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Add members to your favorites first to grant them wardrobe access.
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Private Photo Access Section */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Private Photos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {photoAccessList.length === 0 
                        ? "No one has access to your private photos"
                        : `${photoAccessList.length} member${photoAccessList.length !== 1 ? 's' : ''} can view`}
                    </p>
                  </div>
                  <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-manage-photo-access">
                        <Users className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-accent">Private Photo Access</DialogTitle>
                        <DialogDescription>
                          Choose who can view your private photos. Only selected members will have access.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {photoAccessList.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Members with Access</Label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {photoAccessList.map((access) => (
                                <div 
                                  key={access.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={access.profileImageUrl || undefined} />
                                      <AvatarFallback className="bg-accent/20 text-accent text-xs">
                                        {access.displayName?.charAt(0)?.toUpperCase() || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{access.displayName}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => revokePhotoAccessMutation.mutate(access.grantedUserId)}
                                    disabled={revokePhotoAccessMutation.isPending}
                                    data-testid={`button-revoke-photo-access-${access.grantedUserId}`}
                                  >
                                    <X className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {availableToGrantPhoto.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Add from Favorites</Label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {availableToGrantPhoto.map((fav) => (
                                <div 
                                  key={fav.userId}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={fav.profileImageUrl || undefined} />
                                      <AvatarFallback className="bg-accent/20 text-accent text-xs">
                                        {fav.displayName?.charAt(0)?.toUpperCase() || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{fav.displayName}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => grantPhotoAccessMutation.mutate(fav.userId)}
                                    disabled={grantPhotoAccessMutation.isPending}
                                    data-testid={`button-grant-photo-access-${fav.userId}`}
                                  >
                                    <Plus className="w-4 h-4 text-accent" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {photoAccessList.length === 0 && availableToGrantPhoto.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Add members to your favorites first to grant them private photo access.
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Physical Description & Health */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Physical Description */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-accent">Physical Description</CardTitle>
                <CardDescription>Your appearance details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="hairColor">Hair Color</Label>
                    <select
                      id="hairColor"
                      value={form.watch("hairColor") || ""}
                      onChange={(e) => form.setValue("hairColor", e.target.value)}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-hair-color"
                    >
                      <option value="">Select...</option>
                      <option value="Black">Black</option>
                      <option value="Brown">Brown</option>
                      <option value="Blonde">Blonde</option>
                      <option value="Red">Red</option>
                      <option value="Gray">Gray</option>
                      <option value="White">White</option>
                      <option value="Bald">Bald</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eyeColor">Eye Color</Label>
                    <select
                      id="eyeColor"
                      value={form.watch("eyeColor") || ""}
                      onChange={(e) => form.setValue("eyeColor", e.target.value)}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-eye-color"
                    >
                      <option value="">Select...</option>
                      <option value="Brown">Brown</option>
                      <option value="Blue">Blue</option>
                      <option value="Green">Green</option>
                      <option value="Hazel">Hazel</option>
                      <option value="Gray">Gray</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="build">Build</Label>
                    <select
                      id="build"
                      value={form.watch("build") || ""}
                      onChange={(e) => form.setValue("build", e.target.value)}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-build"
                    >
                      <option value="">Select...</option>
                      <option value="Slim">Slim</option>
                      <option value="Regular">Regular</option>
                      <option value="Athletic">Athletic</option>
                      <option value="Muscular">Muscular</option>
                      <option value="Large">Large</option>
                      <option value="Stocky">Stocky</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bodyHair">Body Hair</Label>
                    <select
                      id="bodyHair"
                      value={form.watch("bodyHair") || ""}
                      onChange={(e) => form.setValue("bodyHair", e.target.value)}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-body-hair"
                    >
                      <option value="">Select...</option>
                      <option value="Smooth">Smooth</option>
                      <option value="Trimmed">Trimmed</option>
                      <option value="Hairy">Hairy</option>
                      <option value="Very Hairy">Very Hairy</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ethnicity">Ethnicity</Label>
                  <select
                    id="ethnicity"
                    value={form.watch("ethnicity") || ""}
                    onChange={(e) => form.setValue("ethnicity", e.target.value)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-ethnicity"
                  >
                    <option value="">Select...</option>
                    <option value="Asian">Asian</option>
                    <option value="Black">Black</option>
                    <option value="Latino">Latino</option>
                    <option value="Middle Eastern">Middle Eastern</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Native American">Native American</option>
                    <option value="Pacific Islander">Pacific Islander</option>
                    <option value="South Asian">South Asian</option>
                    <option value="White">White</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              size="lg"
              disabled={isSaving}
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full md:w-auto font-semibold shadow-lg shadow-accent/10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      </div>

      {/* Profile Picture Selection Dialog */}
      <Dialog open={profilePicDialogOpen} onOpenChange={setProfilePicDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Change Profile Picture</DialogTitle>
            <DialogDescription>
              Select a photo from your gallery to use as your profile picture
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isPhotosLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : isPhotosError ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-muted-foreground">
                  Failed to load your photos.
                </div>
                <Button
                  variant="outline"
                  onClick={() => refetchPhotos()}
                  data-testid="button-retry-photos"
                >
                  Try Again
                </Button>
              </div>
            ) : (myPhotos as Photo[]).length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-muted-foreground">
                  You haven't uploaded any photos yet.
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfilePicDialogOpen(false);
                    navigate("/gallery");
                  }}
                  data-testid="button-go-to-gallery"
                >
                  Go to Gallery to Upload Photos
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {(myPhotos as Photo[]).map((photo) => {
                  const isCurrentProfilePic = user?.profileImageUrl === photo.url;
                  const isThisPhotoSetting = settingPhotoId === photo.id;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        if (!isCurrentProfilePic && !isSettingProfilePhoto) {
                          setSettingPhotoId(photo.id);
                          setProfilePhoto(photo.id, {
                            onSuccess: () => {
                              setSettingPhotoId(null);
                              toast({
                                title: "Profile picture updated",
                                description: "Your new profile picture is now visible to others.",
                              });
                              setProfilePicDialogOpen(false);
                            },
                            onError: () => {
                              setSettingPhotoId(null);
                              toast({
                                title: "Error",
                                description: "Failed to update profile picture. Please try again.",
                                variant: "destructive",
                              });
                            },
                          });
                        }
                      }}
                      disabled={isSettingProfilePhoto}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate ${
                        isCurrentProfilePic
                          ? "border-accent ring-2 ring-accent/50"
                          : "border-transparent hover:border-accent/50"
                      } ${isSettingProfilePhoto && !isThisPhotoSetting ? "opacity-50" : ""}`}
                      data-testid={`button-select-photo-${photo.id}`}
                    >
                      <img
                        src={photo.url}
                        alt="Gallery photo"
                        className="w-full h-full object-cover"
                      />
                      {isCurrentProfilePic && !isThisPhotoSetting && (
                        <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                          <div className="bg-accent text-accent-foreground rounded-full p-2">
                            <Check className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                      {isThisPhotoSetting && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      {photo.isPublic === false && (
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          Private
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setProfilePicDialogOpen(false);
                navigate("/gallery");
              }}
              data-testid="button-upload-new"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload New Photo
            </Button>
            <Button
              variant="ghost"
              onClick={() => setProfilePicDialogOpen(false)}
              data-testid="button-close-profile-pic-dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
