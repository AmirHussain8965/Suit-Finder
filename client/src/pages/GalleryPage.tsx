import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useMyPhotos, useAddPhoto, useDeletePhoto, useSetProfilePhoto, useUpdatePhoto } from "@/hooks/use-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Star, Lock, Globe, Image as ImageIcon, Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Photo } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";

export default function GalleryPage() {
  const { data: photos, isLoading } = useMyPhotos();
  const { mutate: addPhoto, isPending: isAdding } = useAddPhoto();
  const { mutate: deletePhoto, isPending: isDeleting } = useDeletePhoto();
  const { mutate: setProfilePhoto, isPending: isSettingProfile } = useSetProfilePhoto();
  const { mutate: updatePhoto } = useUpdatePhoto();
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [newPhotoIsPublic, setNewPhotoIsPublic] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const publicPhotos = photos?.filter((p: Photo) => p.isPublic) || [];
  const privatePhotos = photos?.filter((p: Photo) => !p.isPublic) || [];
  const profilePhoto = photos?.find((p: Photo) => p.isProfilePhoto);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be under 10MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddPhoto = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a photo to upload", variant: "destructive" });
      return;
    }

    const uploadResponse = await uploadFile(selectedFile);
    if (!uploadResponse) {
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
      return;
    }

    addPhoto(
      { url: uploadResponse.objectPath, caption: newPhotoCaption, isPublic: newPhotoIsPublic, isProfilePhoto: false },
      {
        onSuccess: () => {
          toast({ title: "Photo Added", description: "Your photo has been added to your gallery." });
          setSelectedFile(null);
          setPreviewUrl(null);
          setNewPhotoCaption("");
          setNewPhotoIsPublic(true);
          setDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save photo", variant: "destructive" });
        },
      }
    );
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhoto(photoId, {
      onSuccess: () => {
        toast({ title: "Photo Deleted", description: "Your photo has been removed." });
      },
    });
  };

  const handleSetProfilePhoto = (photoId: number) => {
    setProfilePhoto(photoId, {
      onSuccess: () => {
        toast({ title: "Profile Photo Set", description: "This photo is now your profile photo." });
      },
    });
  };

  const handleTogglePrivacy = (photo: Photo) => {
    updatePhoto(
      { photoId: photo.id, updates: { isPublic: !photo.isPublic } },
      {
        onSuccess: () => {
          toast({ 
            title: photo.isPublic ? "Photo Made Private" : "Photo Made Public",
            description: photo.isPublic ? "Only you can see this photo now." : "Other members can now see this photo."
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout backgroundVariant="double-breasted">
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  const PhotoCard = ({ photo, showActions = true }: { photo: Photo; showActions?: boolean }) => (
    <div className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-card">
      <img 
        src={photo.url} 
        alt={photo.caption || "Gallery photo"} 
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/shapes/svg?seed=" + photo.id;
        }}
      />
      
      {photo.isProfilePhoto && (
        <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <Star className="h-3 w-3" />
          Profile
        </div>
      )}
      
      <div className="absolute top-2 right-2">
        {photo.isPublic ? (
          <Globe className="h-4 w-4 text-green-400 drop-shadow-lg" />
        ) : (
          <Lock className="h-4 w-4 text-yellow-400 drop-shadow-lg" />
        )}
      </div>

      {showActions && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {!photo.isProfilePhoto && (
            <Button 
              size="icon" 
              variant="secondary"
              onClick={() => handleSetProfilePhoto(photo.id)}
              disabled={isSettingProfile}
              data-testid={`button-set-profile-${photo.id}`}
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button 
            size="icon" 
            variant="secondary"
            onClick={() => handleTogglePrivacy(photo)}
            data-testid={`button-toggle-privacy-${photo.id}`}
          >
            {photo.isPublic ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
          </Button>
          <Button 
            size="icon" 
            variant="destructive"
            onClick={() => handleDeletePhoto(photo.id)}
            disabled={isDeleting}
            data-testid={`button-delete-${photo.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="text-white text-sm truncate">{photo.caption}</p>
        </div>
      )}
    </div>
  );

  return (
    <Layout backgroundVariant="double-breasted">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground">Photo Gallery</h1>
              <p className="text-muted-foreground mt-1">
                Manage your public and private photos. Profile photo is required.
              </p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-add-photo">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Photo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-serif text-accent">Add New Photo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Photo</Label>
                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-photo-file"
                    />
                    {previewUrl ? (
                      <div className="relative">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg border border-border"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          data-testid="button-remove-preview"
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-select-photo"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-2">
                            <Camera className="h-8 w-8 text-muted-foreground" />
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Tap to take photo or choose from library</p>
                          <p className="text-xs text-muted-foreground">Max 10MB, JPEG or PNG</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photoCaption">Caption (optional)</Label>
                    <Input 
                      id="photoCaption"
                      placeholder="Describe your photo..."
                      value={newPhotoCaption}
                      onChange={(e) => setNewPhotoCaption(e.target.value)}
                      data-testid="input-photo-caption"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Public Photo</Label>
                      <p className="text-xs text-muted-foreground">Others can see this in your profile</p>
                    </div>
                    <Switch 
                      checked={newPhotoIsPublic}
                      onCheckedChange={setNewPhotoIsPublic}
                      data-testid="switch-photo-public"
                    />
                  </div>
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading... {progress}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div 
                          className="bg-accent h-2 rounded-full transition-all" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleAddPhoto} 
                    disabled={isAdding || isUploading || !selectedFile}
                    className="bg-accent text-accent-foreground"
                    data-testid="button-submit-photo"
                  >
                    {(isAdding || isUploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Photo"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!profilePhoto && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="flex items-center gap-4 py-4">
                <ImageIcon className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-medium text-foreground">Profile Photo Required</p>
                  <p className="text-sm text-muted-foreground">
                    Add a photo and set it as your profile photo. This can be with or without your face.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-serif text-accent flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Gallery
              </CardTitle>
              <CardDescription>These photos are visible to other members viewing your profile.</CardDescription>
            </CardHeader>
            <CardContent>
              {publicPhotos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No public photos yet. Add your first photo above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {publicPhotos.map((photo: Photo) => (
                    <PhotoCard key={photo.id} photo={photo} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-serif text-accent flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Private Gallery
              </CardTitle>
              <CardDescription>Only you can see these photos. Share access with individual members.</CardDescription>
            </CardHeader>
            <CardContent>
              {privatePhotos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No private photos yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {privatePhotos.map((photo: Photo) => (
                    <PhotoCard key={photo.id} photo={photo} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
