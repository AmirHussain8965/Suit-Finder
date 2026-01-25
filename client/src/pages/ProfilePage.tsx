import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProfileSchema } from "@shared/schema";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { useProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Users, X, Plus, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema for the form - allow partial updates
const profileFormSchema = insertProfileSchema.partial();
type ProfileFormValues = z.infer<typeof profileFormSchema>;

type WardrobeAccessUser = {
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
  const [wardrobeDialogOpen, setWardrobeDialogOpen] = useState(false);

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
      hivStatus: "",
      onPrep: false,
      lastStdScreening: null,
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
        hivStatus: profile.hivStatus || "",
        onPrep: profile.onPrep ?? false,
        lastStdScreening: profile.lastStdScreening || null,
      });
    }
  }, [profile, user, form]);

  const suitCategories = [
    "wet", "gunging", "ripping", "touching", "shoe worship", "sock/foot play",
    "fully clothed sex", "watersports", "bukkake", "simple meet and greet",
    "butler", "toys", "bondage", "Dom/Sub"
  ];

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
          <Avatar className="h-32 w-32 border-4 border-card shadow-xl ring-2 ring-accent/50">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-4xl bg-primary text-accent">
              {user?.firstName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-4xl font-serif font-bold text-foreground">
              {profile?.displayName || user?.firstName || "Member"}
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Manage your public appearance and preferences within the network.
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

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select 
                    id="role" 
                    {...form.register("role")} 
                    className="w-full h-9 px-3 rounded-md bg-background border border-input focus:border-accent text-sm"
                    data-testid="select-role"
                  >
                    <option value="">Select role...</option>
                    <option value="Top">Top</option>
                    <option value="Bottom">Bottom</option>
                    <option value="Vers">Vers</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestType">Interest (Styling only or Fetish)</Label>
                  <div className="flex gap-4">
                    {["Styling only", "Fetish"].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border bg-background/50 flex-1 justify-center hover-elevate">
                        <input
                          type="radio"
                          value={type}
                          checked={form.watch("interestType") === type}
                          onChange={() => form.setValue("interestType", type)}
                          className="h-4 w-4 text-accent border-gray-300 focus:ring-accent"
                        />
                        <span className="text-sm font-medium">{type}</span>
                      </label>
                    ))}
                  </div>
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

                <div className="space-y-3">
                  <Label>Suit Desire Categories</Label>
                  <div className="space-y-4">
                    {suitCategories.map((category) => {
                      const currentCategories = form.watch("categories") || [];
                      const categoryEntry = currentCategories.find((c: any) => c.name === category);
                      const isChecked = !!categoryEntry;

                      return (
                        <div key={category} className="space-y-2 p-3 rounded-lg border border-border bg-background/50">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`cat-${category}`}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  form.setValue("categories", [...currentCategories, { name: category, mode: 'both' }]);
                                } else {
                                  form.setValue("categories", currentCategories.filter((c: any) => c.name !== category));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                            />
                            <Label htmlFor={`cat-${category}`} className="text-sm font-bold capitalize">
                              {category}
                            </Label>
                          </div>
                          
                          {isChecked && (
                            <div className="flex gap-4 ml-6 pt-1">
                              {['give', 'receive', 'both'].map((mode) => (
                                <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`mode-${category}`}
                                    checked={categoryEntry.mode === mode}
                                    onChange={() => {
                                      form.setValue("categories", currentCategories.map((c: any) => 
                                        c.name === category ? { ...c, mode } : c
                                      ));
                                    }}
                                    className="h-3 w-3 text-accent border-gray-300 focus:ring-accent"
                                  />
                                  <span className="text-xs capitalize text-muted-foreground">{mode}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
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
                    checked={form.watch("isVisible")}
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

            {/* Health Info */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="font-serif text-accent">Health Information</CardTitle>
                <CardDescription>Optional health details for safer connections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hivStatus">HIV Status</Label>
                  <select
                    id="hivStatus"
                    value={form.watch("hivStatus") || ""}
                    onChange={(e) => form.setValue("hivStatus", e.target.value)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-hiv-status"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Negative">Negative</option>
                    <option value="Positive">Positive</option>
                    <option value="Undetectable">Undetectable</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">On PrEP</Label>
                    <p className="text-xs text-muted-foreground">
                      Currently taking pre-exposure prophylaxis
                    </p>
                  </div>
                  <Switch 
                    checked={form.watch("onPrep") ?? false}
                    onCheckedChange={(checked) => form.setValue("onPrep", checked)}
                    className="data-[state=checked]:bg-accent"
                    data-testid="switch-on-prep"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastStdScreening">Last STD Screening</Label>
                  <Input 
                    id="lastStdScreening" 
                    type="date"
                    value={form.watch("lastStdScreening") ? new Date(form.watch("lastStdScreening") as any).toISOString().split('T')[0] : ""}
                    onChange={(e) => form.setValue("lastStdScreening", e.target.value ? new Date(e.target.value) : null)}
                    className="bg-background border-input focus:border-accent"
                    data-testid="input-last-std-screening"
                  />
                  <p className="text-xs text-muted-foreground">
                    When was your most recent STD test?
                  </p>
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
    </Layout>
  );
}
