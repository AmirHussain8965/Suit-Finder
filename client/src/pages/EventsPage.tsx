import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Calendar, MapPin, Users, Clock, Check, X, Eye, EyeOff, Trash2, ArrowLeft } from "lucide-react";
import type { EventWithDetails } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { usePremiumFeature } from "@/hooks/use-subscription";
import { PremiumGate } from "@/components/PremiumGate";

export default function EventsPage() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { isPremium, isLoading: isPremiumLoading } = usePremiumFeature();
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    location: "",
    maxAttendees: "",
    isPublic: true,
  });

  const { data: events, isLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events"],
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      setIsCreating(false);
      setNewEvent({
        title: "",
        description: "",
        eventDate: "",
        eventTime: "",
        location: "",
        maxAttendees: "",
        isPublic: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const joinEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("POST", buildUrl("/api/events/:eventId/join", { eventId }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (selectedEvent) {
        refetchEvent(selectedEvent.id);
      }
    },
  });

  const leaveEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("DELETE", buildUrl("/api/events/:eventId/leave", { eventId }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (selectedEvent) {
        refetchEvent(selectedEvent.id);
      }
    },
  });

  const updateAttendeeMutation = useMutation({
    mutationFn: async ({ eventId, userId, status }: { eventId: number; userId: string; status: string }) => {
      return apiRequest("PATCH", `/api/events/${eventId}/attendees/${userId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (selectedEvent) {
        refetchEvent(selectedEvent.id);
      }
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("DELETE", buildUrl("/api/events/:eventId", { eventId }));
    },
    onSuccess: () => {
      setSelectedEvent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const refetchEvent = async (eventId: number) => {
    const res = await fetch(buildUrl("/api/events/:eventId", { eventId }), { credentials: "include" });
    if (res.ok) {
      const event = await res.json();
      setSelectedEvent(event);
    }
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.eventDate || !newEvent.eventTime) return;
    
    const dateTime = new Date(`${newEvent.eventDate}T${newEvent.eventTime}`);
    
    createEventMutation.mutate({
      title: newEvent.title,
      description: newEvent.description || null,
      category: "social_dinner",
      eventDate: dateTime.toISOString(),
      location: newEvent.location || null,
      maxAttendees: newEvent.maxAttendees ? parseInt(newEvent.maxAttendees) : null,
      isPublic: newEvent.isPublic,
    });
  };

  const isHost = (event: EventWithDetails) => event.hostId === currentUserId;

  if (isLoading || isPremiumLoading) {
    return (
      <Layout backgroundVariant="events">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (!isPremium) {
    return (
      <Layout backgroundVariant="events">
        <PremiumGate featureName="events">
          <div />
        </PremiumGate>
      </Layout>
    );
  }

  if (selectedEvent) {
    const canSeeDetails = selectedEvent.isAttending || isHost(selectedEvent);
    
    return (
      <Layout backgroundVariant="events">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedEvent(null)}
            data-testid="button-back-events"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-serif">{selectedEvent.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {selectedEvent.host.displayName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    Hosted by {selectedEvent.host.displayName || "Anonymous"}
                  </CardDescription>
                </div>
                
                {isHost(selectedEvent) && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this event?")) {
                        deleteEventMutation.mutate(selectedEvent.id);
                      }
                    }}
                    data-testid="button-delete-event"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(selectedEvent.eventDate), "EEEE, MMMM d, yyyy")}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(selectedEvent.eventDate), "h:mm a")}</span>
              </div>

              {canSeeDetails ? (
                <>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <div className="pt-4 border-t">
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  )}

                  {selectedEvent.attendees && (
                    <div className="pt-4 border-t">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Attendees ({selectedEvent.attendees.filter(a => a.status === "approved").length})
                        {selectedEvent.maxAttendees && ` / ${selectedEvent.maxAttendees}`}
                      </h3>
                      <div className="space-y-2">
                        {selectedEvent.attendees.map((attendee) => (
                          <div 
                            key={attendee.userId} 
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {attendee.displayName?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{attendee.displayName || "Anonymous"}</span>
                              {attendee.userId === selectedEvent.hostId && (
                                <Badge variant="secondary">Host</Badge>
                              )}
                            </div>
                            
                            {isHost(selectedEvent) && attendee.userId !== currentUserId && (
                              <div className="flex items-center gap-1">
                                {attendee.status === "pending" ? (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => updateAttendeeMutation.mutate({
                                        eventId: selectedEvent.id,
                                        userId: attendee.userId,
                                        status: "approved",
                                      })}
                                      data-testid={`button-approve-${attendee.userId}`}
                                    >
                                      <Check className="w-4 h-4 text-green-500" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => updateAttendeeMutation.mutate({
                                        eventId: selectedEvent.id,
                                        userId: attendee.userId,
                                        status: "declined",
                                      })}
                                      data-testid={`button-decline-${attendee.userId}`}
                                    >
                                      <X className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant={attendee.status === "approved" ? "default" : "destructive"}>
                                    {attendee.status}
                                  </Badge>
                                )}
                              </div>
                            )}
                            
                            {!isHost(selectedEvent) && attendee.userId !== currentUserId && (
                              <Badge variant={attendee.status === "approved" ? "default" : "secondary"}>
                                {attendee.status}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="pt-4 border-t flex items-center gap-2 text-muted-foreground">
                  <EyeOff className="w-4 h-4" />
                  <span>Join this event to see full details and attendee list</span>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              {!isHost(selectedEvent) && (
                selectedEvent.isAttending ? (
                  <Button 
                    variant="outline" 
                    onClick={() => leaveEventMutation.mutate(selectedEvent.id)}
                    disabled={leaveEventMutation.isPending}
                    data-testid="button-leave-event"
                  >
                    {leaveEventMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Leave Event
                  </Button>
                ) : (
                  <Button 
                    onClick={() => joinEventMutation.mutate(selectedEvent.id)}
                    disabled={joinEventMutation.isPending}
                    data-testid="button-join-event"
                  >
                    {joinEventMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Request to Join
                  </Button>
                )
              )}
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout backgroundVariant="events">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold">Events</h1>
            <p className="text-muted-foreground">Discover and join formal gatherings</p>
          </div>
          
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-event">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create a New Event</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Gentlemen's Evening"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    data-testid="input-event-title"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newEvent.eventDate}
                      onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                      data-testid="input-event-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newEvent.eventTime}
                      onChange={(e) => setNewEvent({ ...newEvent, eventTime: e.target.value })}
                      data-testid="input-event-time"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (visible to attendees only)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., The Grand Hotel, Room 212"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    data-testid="input-event-location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your event..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                    data-testid="input-event-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAttendees">Max Attendees (optional)</Label>
                  <Input
                    id="maxAttendees"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={newEvent.maxAttendees}
                    onChange={(e) => setNewEvent({ ...newEvent, maxAttendees: e.target.value })}
                    data-testid="input-event-max-attendees"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublic" className="flex items-center gap-2">
                    {newEvent.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {newEvent.isPublic ? "Public Event" : "Invite Only"}
                  </Label>
                  <Switch
                    id="isPublic"
                    checked={newEvent.isPublic}
                    onCheckedChange={(v) => setNewEvent({ ...newEvent, isPublic: v })}
                    data-testid="switch-event-public"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateEvent}
                  disabled={createEventMutation.isPending || !newEvent.title || !newEvent.eventDate || !newEvent.eventTime}
                  data-testid="button-submit-event"
                >
                  {createEventMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Create Event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!events || events.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Events Yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to create a formal gathering</p>
            <Button onClick={() => setIsCreating(true)} data-testid="button-create-first-event">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
                <Card 
                  key={event.id} 
                  className="cursor-pointer hover-elevate transition-all"
                  onClick={() => setSelectedEvent(event)}
                  data-testid={`card-event-${event.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-serif">{event.title}</CardTitle>
                      </div>
                      {event.isAttending && (
                        <Badge variant="secondary">
                          <Check className="w-3 h-3 mr-1" />
                          Joined
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.eventDate), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.eventDate), "h:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.attendeeCount} attending
                        {event.maxAttendees && ` / ${event.maxAttendees}`}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {event.host.displayName?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>Hosted by {event.host.displayName || "Anonymous"}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
