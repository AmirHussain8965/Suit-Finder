import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Camera, Upload, CheckCircle } from "lucide-react";
import { useUpload } from "@/hooks/use-upload";

export function ProfileCompletion() {
  const [displayName, setDisplayName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadFile, isUploading, progress } = useUpload();

  const addPhotoMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", "/api/photos", {
        url: data.url,
        isPublic: true,
        isProfilePhoto: true,
        caption: "",
      });
      return response.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string }) => {
      const response = await apiRequest("PATCH", "/api/profiles/me", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Complete",
        description: "Welcome to Formal Findings!",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleSubmit = async () => {
    setError("");

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Please enter a display name");
      return;
    }

    if (trimmedName.toLowerCase() === "unknown" || trimmedName === "?") {
      setError("Please choose a proper display name");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Display name must be at least 2 characters");
      return;
    }

    if (!selectedFile) {
      setError("Please upload a profile photo (can be faceless)");
      return;
    }

    try {
      const uploadResponse = await uploadFile(selectedFile);
      if (!uploadResponse) {
        setError("Failed to upload photo");
        return;
      }
      
      await addPhotoMutation.mutateAsync({ url: uploadResponse.objectPath });
      
      await updateProfileMutation.mutateAsync({ displayName: trimmedName });
    } catch (err: any) {
      setError(err.message || "Failed to complete profile");
    }
  };

  const isSubmitting = isUploading || addPhotoMutation.isPending || updateProfileMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <User className="w-8 h-8 text-accent" />
          </div>
          <CardTitle className="text-2xl font-serif text-foreground">Complete Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            To join the Formal Findings community, please add a display name and profile photo.
            Your photo can be faceless if you prefer privacy.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div 
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-32 w-32 border-4 border-card shadow-xl ring-2 ring-accent/50">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} />
                ) : (
                  <AvatarFallback className="text-4xl bg-primary text-accent">
                    <Camera className="w-10 h-10 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-8 h-8 text-white" />
              </div>
              {previewUrl && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-profile-photo"
            />
            <p className="text-sm text-muted-foreground">
              Click to upload a photo (can be faceless)
            </p>
            {isUploading && (
              <div className="w-full max-w-xs">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">Uploading... {progress}%</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-background border-input focus:border-accent"
              data-testid="input-display-name"
            />
            <p className="text-xs text-muted-foreground">
              This is how other members will see you.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-complete-profile"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing Profile...
              </>
            ) : (
              "Complete Profile"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
