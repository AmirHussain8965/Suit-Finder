import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Calendar, Lock, Check, X } from "lucide-react";
import { format } from "date-fns";

interface AdminEvent {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  timezone: string;
  locationName: string;
  locationAddress: string | null;
  coverImageUrl: string | null;
  rsvpUrl: string | null;
  priceCents: number | null;
  currency: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventFormData {
  title: string;
  slug: string;
  description: string;
  startAt: string;
  endAt: string;
  timezone: string;
  locationName: string;
  locationAddress: string;
  coverImageUrl: string;
  rsvpUrl: string;
  priceCents: string;
  currency: string;
  isPublished: boolean;
}

const defaultFormData: EventFormData = {
  title: "",
  slug: "",
  description: "",
  startAt: "",
  endAt: "",
  timezone: "America/New_York",
  locationName: "",
  locationAddress: "",
  coverImageUrl: "",
  rsvpUrl: "",
  priceCents: "",
  currency: "USD",
  isPublished: false,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AdminEventsPage() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const adminKey = urlParams.get("key") || "";
  
  const [isVerified, setIsVerified] = useState(false);
  const [keyInput, setKeyInput] = useState(adminKey);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [autoSlug, setAutoSlug] = useState(true);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const verifyQuery = useQuery({
    queryKey: ["/api/admin/verify", adminKey],
    queryFn: async () => {
      if (!adminKey) return { valid: false };
      const res = await fetch(`/api/admin/verify?key=${adminKey}`);
      return res.json();
    },
    enabled: !!adminKey,
  });

  useEffect(() => {
    if (verifyQuery.data?.valid) {
      setIsVerified(true);
    }
  }, [verifyQuery.data]);

  const eventsQuery = useQuery<AdminEvent[]>({
    queryKey: ["/api/admin/events", adminKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/events?key=${adminKey}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    enabled: isVerified,
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await fetch(`/api/admin/events`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          slug: data.slug,
          description: data.description || null,
          startAt: data.startAt,
          endAt: data.endAt || null,
          timezone: data.timezone,
          locationName: data.locationName,
          locationAddress: data.locationAddress || null,
          coverImageUrl: data.coverImageUrl || null,
          rsvpUrl: data.rsvpUrl || null,
          priceCents: data.priceCents ? parseInt(data.priceCents) : null,
          currency: data.currency,
          isPublished: data.isPublished,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event Created", description: "The event was created successfully." });
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      setEditingEvent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: EventFormData }) => {
      const res = await fetch(`/api/admin/events/${slug}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          startAt: data.startAt,
          endAt: data.endAt || null,
          timezone: data.timezone,
          locationName: data.locationName,
          locationAddress: data.locationAddress || null,
          coverImageUrl: data.coverImageUrl || null,
          rsvpUrl: data.rsvpUrl || null,
          priceCents: data.priceCents ? parseInt(data.priceCents) : null,
          currency: data.currency,
          isPublished: data.isPublished,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event Updated", description: "The event was updated successfully." });
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      setEditingEvent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/admin/events/${slug}?key=${adminKey}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event Deleted", description: "The event was deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmitKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput) {
      const newUrl = `${window.location.pathname}?key=${keyInput}`;
      window.history.replaceState({}, "", newUrl);
      window.location.reload();
    }
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    setFormData(defaultFormData);
    setAutoSlug(true);
    setIsDialogOpen(true);
  };

  const openEditDialog = (event: AdminEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      slug: event.slug,
      description: event.description || "",
      startAt: event.startAt ? new Date(event.startAt).toISOString().slice(0, 16) : "",
      endAt: event.endAt ? new Date(event.endAt).toISOString().slice(0, 16) : "",
      timezone: event.timezone || "America/New_York",
      locationName: event.locationName || "",
      locationAddress: event.locationAddress || "",
      coverImageUrl: event.coverImageUrl || "",
      rsvpUrl: event.rsvpUrl || "",
      priceCents: event.priceCents?.toString() || "",
      currency: event.currency || "USD",
      isPublished: event.isPublished,
    });
    setAutoSlug(false);
    setIsDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: autoSlug && !editingEvent ? slugify(title) : prev.slug,
    }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!formData.slug.trim()) {
      toast({ title: "Error", description: "Slug is required", variant: "destructive" });
      return;
    }
    if (!formData.startAt) {
      toast({ title: "Error", description: "Start time is required", variant: "destructive" });
      return;
    }

    if (editingEvent) {
      updateMutation.mutate({ slug: editingEvent.slug, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (slug: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate(slug);
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Admin Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-key">Admin Key</Label>
                <Input
                  id="admin-key"
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter admin key"
                  data-testid="input-admin-key"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-key">
                Access Admin
              </Button>
              {verifyQuery.data?.valid === false && adminKey && (
                <p className="text-sm text-destructive text-center">Invalid admin key</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold" data-testid="text-admin-title">
              Events Admin
            </h1>
            <p className="text-muted-foreground">Manage events for Formal Findings</p>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-create-event">
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>

        {eventsQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        )}

        {eventsQuery.isError && (
          <Card className="p-6 text-center">
            <p className="text-destructive">Failed to load events</p>
            <Button variant="outline" onClick={() => eventsQuery.refetch()} className="mt-4">
              Retry
            </Button>
          </Card>
        )}

        {eventsQuery.data && eventsQuery.data.length === 0 && (
          <Card className="p-8 text-center" data-testid="empty-state">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No events yet. Create your first event.</p>
          </Card>
        )}

        {eventsQuery.data && eventsQuery.data.length > 0 && (
          <div className="space-y-3">
            {eventsQuery.data.map((event) => (
              <Card key={event.id} className="p-4" data-testid={`card-event-${event.slug}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      <Badge variant={event.isPublished ? "default" : "secondary"}>
                        {event.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.startAt && format(new Date(event.startAt), "MMM d, yyyy h:mm a")} | {event.locationName || "No location"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Slug: {event.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(event)}
                      data-testid={`button-edit-${event.slug}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(event.slug)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${event.slug}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Event title"
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setFormData(prev => ({ ...prev, slug: e.target.value }));
                  }}
                  placeholder="event-slug"
                  disabled={!!editingEvent}
                  data-testid="input-slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startAt">Start Date/Time *</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                  data-testid="input-start-at"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">End Date/Time</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                  data-testid="input-end-at"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                placeholder="America/New_York"
                data-testid="input-timezone"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  value={formData.locationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationName: e.target.value }))}
                  placeholder="The Grand Ballroom"
                  data-testid="input-location-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationAddress">Location Address</Label>
                <Input
                  id="locationAddress"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationAddress: e.target.value }))}
                  placeholder="123 Main St, City, State"
                  data-testid="input-location-address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImageUrl">Cover Image URL</Label>
              <Input
                id="coverImageUrl"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-cover-image"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rsvpUrl">RSVP URL</Label>
              <Input
                id="rsvpUrl"
                value={formData.rsvpUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, rsvpUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-rsvp-url"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priceCents">Price (in cents)</Label>
                <Input
                  id="priceCents"
                  type="number"
                  value={formData.priceCents}
                  onChange={(e) => setFormData(prev => ({ ...prev, priceCents: e.target.value }))}
                  placeholder="0 = free, 5000 = $50"
                  data-testid="input-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="USD"
                  data-testid="input-currency"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
                data-testid="switch-published"
              />
              <Label htmlFor="isPublished" className="cursor-pointer">
                Published (visible to public)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingEvent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
