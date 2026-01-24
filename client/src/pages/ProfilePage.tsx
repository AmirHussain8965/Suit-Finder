import { useEffect } from "react";
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
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Schema for the form - allow partial updates
const profileFormSchema = insertProfileSchema.partial();
type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      styleInterests: "",
      role: "",
      isVisible: true,
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
        isVisible: profile.isVisible ?? true,
      });
    }
  }, [profile, user, form]);

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
      <Layout>
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
                  <Label htmlFor="role">Role (Submissive, Dominant, Vers)</Label>
                  <Input 
                    id="role" 
                    {...form.register("role")} 
                    className="bg-background border-input focus:border-accent"
                    placeholder="E.g. Dominant"
                  />
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
                  />
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
    </Layout>
  );
}
