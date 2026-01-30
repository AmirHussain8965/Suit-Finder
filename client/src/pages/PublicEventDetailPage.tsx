import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, MapPin, Clock, ArrowLeft, ExternalLink, Image as ImageIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface EventDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  startAt: string;
  endAt: string;
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

export default function PublicEventDetailPage() {
  const [, params] = useRoute("/events/:slug");
  const slug = params?.slug;

  const { data: event, isLoading, isError } = useQuery<EventDetail | null>({
    queryKey: ["/api/events", slug ?? ""],
    enabled: !!slug,
  });

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "h:mm a");
  };

  const formatPrice = (cents: number, currency: string) => {
    const dollars = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(dollars);
  };

  const isPastEvent = (startAt: string) => {
    return new Date(startAt) < new Date();
  };

  if (isLoading) {
    return (
      <Layout backgroundVariant="events">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-accent" data-testid="loader-event-detail" />
        </div>
      </Layout>
    );
  }

  if (isError || !event) {
    return (
      <Layout backgroundVariant="events">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Link href="/events">
            <Button variant="ghost" data-testid="button-back-events">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-serif mb-2">Event not found</h2>
            <p className="text-muted-foreground mb-4">
              This event may have been removed or the link is incorrect.
            </p>
            <Link href="/events">
              <Button data-testid="button-view-all-events">View All Events</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout backgroundVariant="events">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <Link href="/events">
          <Button variant="ghost" data-testid="button-back-events">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </Link>

        <Card className="overflow-hidden">
          {event.coverImageUrl ? (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={event.coverImageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
                data-testid="img-event-cover"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-muted-foreground" />
            </div>
          )}

          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <CardTitle className="text-2xl md:text-3xl font-serif" data-testid="text-event-title">
                  {event.title}
                </CardTitle>
                {isPastEvent(event.startAt) && (
                  <Badge variant="secondary" data-testid="badge-past-event">Past Event</Badge>
                )}
              </div>
              {event.priceCents !== null && event.priceCents > 0 && (
                <Badge variant="outline" className="text-lg px-3 py-1" data-testid="badge-event-price">
                  <DollarSign className="w-4 h-4 mr-1" />
                  {formatPrice(event.priceCents, event.currency)}
                </Badge>
              )}
              {event.priceCents === 0 && (
                <Badge variant="outline" className="text-lg px-3 py-1" data-testid="badge-event-free">
                  Free
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-accent flex-shrink-0" />
                <div>
                  <p className="font-medium" data-testid="text-event-date">
                    {formatEventDate(event.startAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">Date</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-accent flex-shrink-0" />
                <div>
                  <p className="font-medium" data-testid="text-event-time">
                    {formatEventTime(event.startAt)}
                    {event.endAt ? ` - ${formatEventTime(event.endAt)}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{event.timezone}</p>
                </div>
              </div>

              {event.locationName && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium" data-testid="text-event-location">
                      {event.locationName}
                    </p>
                    {event.locationAddress && (
                      <p className="text-sm text-muted-foreground" data-testid="text-event-address">
                        {event.locationAddress}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">About This Event</h3>
                <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-event-description">
                  {event.description}
                </p>
              </div>
            )}

            {event.rsvpUrl && !isPastEvent(event.startAt) && (
              <div className="pt-4 border-t">
                <a href={event.rsvpUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full md:w-auto" data-testid="button-rsvp">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    RSVP / Register
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
