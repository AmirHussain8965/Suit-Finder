import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Heart, Trash2, Pencil, Shirt, X, Upload, Briefcase, Watch, Gem, Package, Star } from "lucide-react";
import type { WardrobeItem } from "@shared/schema";
import { wardrobeCategories } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { usePlatinumFeature } from "@/hooks/use-subscription";
import { PlatinumGate } from "@/components/PremiumGate";
import type { LucideIcon } from "lucide-react";

const categoryLabels: Record<string, string> = {
  suits: "Suits",
  jackets: "Jackets & Blazers",
  shirts: "Dress Shirts",
  ties: "Ties & Bowties",
  pocket_squares: "Pocket Squares",
  shoes: "Dress Shoes",
  belts: "Belts",
  watches: "Watches",
  cufflinks: "Cufflinks",
  accessories: "Accessories",
  pants: "Trousers",
  vests: "Vests & Waistcoats",
  overcoats: "Overcoats",
  other: "Other",
};

const getCategoryIcon = (category: string): LucideIcon => {
  switch (category) {
    case "suits":
    case "jackets":
    case "overcoats":
      return Briefcase;
    case "shirts":
    case "ties":
    case "vests":
      return Shirt;
    case "watches":
      return Watch;
    case "cufflinks":
    case "pocket_squares":
      return Gem;
    case "accessories":
      return Star;
    default:
      return Package;
  }
};

export default function WardrobePage() {
  const { user } = useAuth();
  const { isPlatinum, isLoading: isPlatinumLoading } = usePlatinumFeature();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "suits" as string,
    description: "",
    brand: "",
    color: "",
  });

  const queryKey = selectedCategory 
    ? ["/api/wardrobe", { category: selectedCategory }]
    : ["/api/wardrobe"];

  const { data: items, isLoading } = useQuery<WardrobeItem[]>({
    queryKey,
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/wardrobe?category=${selectedCategory}`
        : "/api/wardrobe";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wardrobe");
      return res.json();
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
        credentials: "include",
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      
      return objectPath;
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; description?: string; brand?: string; color?: string; imageUrl?: string }) => {
      return apiRequest("POST", "/api/wardrobe", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobe"] });
      resetForm();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WardrobeItem> }) => {
      return apiRequest("PATCH", `/api/wardrobe/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobe"] });
      resetForm();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/wardrobe/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobe"] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/wardrobe/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobe"] });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", category: "suits", description: "", brand: "", color: "" });
    setImageFile(null);
    setImagePreview(null);
    setIsCreating(false);
    setEditingItem(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) return;

    let imageUrl: string | undefined;
    
    if (imageFile) {
      try {
        imageUrl = await uploadImageMutation.mutateAsync(imageFile);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    const itemData = {
      name: formData.name,
      category: formData.category,
      description: formData.description || undefined,
      brand: formData.brand || undefined,
      color: formData.color || undefined,
      imageUrl: imageUrl || (editingItem?.imageUrl ?? undefined),
    };

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: itemData });
    } else {
      createItemMutation.mutate(itemData);
    }
  };

  const openEditDialog = (item: WardrobeItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || "",
      brand: item.brand || "",
      color: item.color || "",
    });
    setImagePreview(item.imageUrl || null);
    setIsCreating(true);
  };

  const getCategoryCounts = () => {
    if (!items) return {};
    const allItems = items;
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  };

  if (isLoading || isPlatinumLoading) {
    return (
      <Layout backgroundVariant="double-breasted">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (!isPlatinum) {
    return (
      <Layout backgroundVariant="double-breasted">
        <PlatinumGate featureName="Virtual Wardrobe">
          <div />
        </PlatinumGate>
      </Layout>
    );
  }

  return (
    <Layout backgroundVariant="double-breasted">
      <div className="flex flex-col h-full">
        <div className="p-4 md:p-6 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-serif font-bold text-accent">Virtual Wardrobe</h1>
              <p className="text-muted-foreground text-sm">Organize your formal attire collection</p>
            </div>
            
            <Dialog open={isCreating} onOpenChange={(open) => { if (!open) resetForm(); else setIsCreating(true); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Item" : "Add to Wardrobe"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Photo</Label>
                    <div className="flex flex-col items-center gap-4">
                      {imagePreview ? (
                        <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 bg-background/80"
                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="w-full h-32 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                            data-testid="input-item-image"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g., Navy Pinstripe Suit"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-item-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger data-testid="select-item-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {wardrobeCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {categoryLabels[cat] || cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Input
                        placeholder="e.g., Brooks Brothers"
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        data-testid="input-item-brand"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input
                        placeholder="e.g., Navy Blue"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        data-testid="input-item-color"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Add details about this item..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="resize-none"
                      rows={3}
                      data-testid="input-item-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.name || !formData.category || createItemMutation.isPending || updateItemMutation.isPending || uploadImageMutation.isPending}
                    data-testid="button-save-item"
                  >
                    {(createItemMutation.isPending || updateItemMutation.isPending || uploadImageMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingItem ? "Save Changes" : "Add Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="filter-all"
                >
                  All ({items?.length || 0})
                </Button>
                {wardrobeCategories.map((cat) => {
                  const count = items?.filter(i => i.category === cat).length || 0;
                  if (count === 0 && selectedCategory !== cat) return null;
                  return (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      data-testid={`filter-${cat}`}
                    >
                      {categoryLabels[cat]} ({count})
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {items?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Shirt className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Your Wardrobe is Empty</h3>
              <p className="text-muted-foreground mb-4">Start building your formal attire collection</p>
              <Button onClick={() => setIsCreating(true)} data-testid="button-empty-add">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items?.map((item) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden group hover-elevate"
                  data-testid={`wardrobe-item-${item.id}`}
                >
                  <div className="relative aspect-square bg-muted">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (() => {
                        const IconComponent = getCategoryIcon(item.category);
                        return (
                          <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            <IconComponent className="h-12 w-12 text-muted-foreground" />
                          </div>
                        );
                      })()
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-background/80"
                        onClick={() => toggleFavoriteMutation.mutate(item.id)}
                        data-testid={`button-favorite-${item.id}`}
                      >
                        <Heart className={`h-4 w-4 ${item.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-background/80"
                        onClick={() => openEditDialog(item)}
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 bg-background/80 hover:bg-red-500/20"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {item.isFavorite && (
                      <div className="absolute top-2 left-2">
                        <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabels[item.category] || item.category}
                      </Badge>
                    </div>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{item.brand}</p>
                    )}
                    {item.color && (
                      <p className="text-xs text-muted-foreground truncate">{item.color}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
