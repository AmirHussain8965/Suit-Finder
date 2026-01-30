import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, MapPin, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface PublicEvent {
  id: number;
  title: string;
  slug: string;
  startAt: string;
  endAt: string;
  timezone: string;
  locationName: string;
  coverImageUrl: string | null;
  isPublished: boolean;
}

export default function PublicEventsPage() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialShowPast = urlParams.get("includePast") === "true";
  
  const [showPastEvents, setShowPastEvents] = useState(initialShowPast);

  const { data: events, isLoading, isError, refetch } = useQuery<PublicEvent[]>({
    queryKey: ["/api/events", { publishedOnly: true, includePast: showPastEvents }],
  });

  const handleTogglePastEvents = (checked: boolean) => {
    setShowPastEvents(checked);
    const newParams = new URLSearchParams(window.location.search);
    if (checked) {
      newParams.set("includePast", "true");
    } else {
      newParams.delete("includePast");
    }
    const newUrl = newParams.toString() 
      ? `${window.location.pathname}?${newParams}` 
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  };

  const formatEventDate = (startAt: string, timezone: string) => {
    const date = new Date(startAt);
    return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
  };

  if (isLoading) {
    return (
      <Layout backgroundVariant="events">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-accent" data-testid="loader-events" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout backgroundVariant="events">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-serif mb-2">Unable to load events</h2>
            <p className="text-muted-foreground mb-4">
              There was an issue loading the events. Please try again.
            </p>
            <Button onClick={() => refetch()} data-testid="button-retry-events">
              Try Again
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout backgroundVariant="events">
      {/* Temporary Debug Panel */}
      <div className="bg-yellow-500/20 border border-yellow-500 p-2 text-xs text-yellow-200">
        <strong>DEBUG:</strong> 
        Loading: {isLoading ? 'YES' : 'NO'} | 
        Events: {events ? events.length : 'null'} | 
        Error: {isError ? 'YES' : 'none'} |
        ShowPast: {showPastEvents ? 'YES' : 'NO'}
      </div>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold" data-testid="text-page-title">
              Upcoming Events
            </h1>
            <p className="text-muted-foreground">
              Discover formal gatherings and sartorial meetups
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-past"
              checked={showPastEvents}
              onCheckedChange={handleTogglePastEvents}
              data-testid="switch-show-past"
            />
            <Label htmlFor="show-past" className="cursor-pointer">
              Show past events
            </Label>
          </div>
        </div>

        {!events || events.length === 0 ? (
          <Card className="p-8 text-center" data-testid="empty-state">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-serif mb-2">No events found</h2>
            <p className="text-muted-foreground">
              {showPastEvents 
                ? "There are no events to display at this time."
                : "There are no upcoming events scheduled. Check back soon or toggle to see past events."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block"
                data-testid={`link-event-${event.slug}`}
              >
                <Card className="hover-elevate h-full overflow-hidden">
                  {event.coverImageUrl ? (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={event.coverImageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        data-testid={`img-event-cover-${event.slug}`}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-muted flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-lg font-serif font-semibold line-clamp-2" data-testid={`text-event-title-${event.slug}`}>
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span data-testid={`text-event-date-${event.slug}`}>
                        {formatEventDate(event.startAt, event.timezone)}
                      </span>
                    </div>
                    {event.locationName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-1" data-testid={`text-event-location-${event.slug}`}>
                          {event.locationName}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
