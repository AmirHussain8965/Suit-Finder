import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { SuitedSilhouettes } from "@/components/SuitedSilhouettes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, MessageCircle, Loader2, EyeOff, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useProfile } from "@/hooks/use-profiles";
import type { Profile } from "@shared/schema";
import whosOnHero from "@/assets/images/whos-on-hero.png";

export default function WhosOnPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: myProfile } = useProfile();

  const { data: onlineUsers = [], isLoading } = useQuery<(Profile & { profileImageUrl: string | null })[]>({
    queryKey: ["/api/whos-on"],
    refetchInterval: 30000,
  });

  const toggleUnderDressedMutation = useMutation({
    mutationFn: async (isUnderDressed: boolean) => {
      const res = await apiRequest("PATCH", "/api/under-dressed", { isUnderDressed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whos-on"] });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/conversations/direct/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation("/messages");
    },
  });

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Unknown";
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 5) return "A few minutes ago";
    if (diffMins < 15) return `${diffMins} minutes ago`;
    return "Online";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SuitedSilhouettes />
      
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img 
            src={whosOnHero} 
            alt="Elegant gentleman in three-piece suit" 
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-accent" />
              Who's On
            </h1>
            <p className="text-muted-foreground mt-1">
              See who's currently browsing the club
            </p>
          </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto">

          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="under-dressed" className="font-medium text-foreground">
                    Go Under Dressed
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Browse invisibly without appearing online
                  </p>
                </div>
              </div>
              <Switch
                id="under-dressed"
                checked={myProfile?.isUnderDressed ?? false}
                onCheckedChange={(checked) => toggleUnderDressedMutation.mutate(checked)}
                disabled={toggleUnderDressedMutation.isPending}
                data-testid="switch-under-dressed"
              />
            </div>
            {myProfile?.isUnderDressed && (
              <p className="mt-3 text-sm text-amber-500 flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                You are currently invisible to other members
              </p>
            )}
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : onlineUsers.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                No one online right now
              </h3>
              <p className="text-muted-foreground mb-4">
                Check back later to see who's browsing the club.
              </p>
              <Button 
                onClick={() => setLocation("/map")}
                className="bg-accent text-accent-foreground"
                data-testid="button-explore-map"
              >
                Explore the Map
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineUsers.map((user) => (
                <Card key={user.userId} className="p-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => setLocation(`/profile/${user.userId}`)}
                    >
                      <Avatar className="h-14 w-14">
                        {user.profileImageUrl ? (
                          <AvatarImage src={user.profileImageUrl} alt={user.displayName || "Member"} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-accent/20 text-accent">
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-serif font-semibold text-foreground truncate cursor-pointer hover:text-accent"
                        onClick={() => setLocation(`/profile/${user.userId}`)}
                        data-testid={`text-username-${user.userId}`}
                      >
                        {user.displayName || "Anonymous Gentleman"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatTimeAgo(user.lastActiveAt)}
                      </p>
                      {user.styleInterests && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {user.styleInterests}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/profile/${user.userId}`)}
                      data-testid={`button-view-profile-${user.userId}`}
                    >
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground"
                      onClick={() => startConversationMutation.mutate(user.userId)}
                      disabled={startConversationMutation.isPending}
                      data-testid={`button-message-${user.userId}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Showing {onlineUsers.length} {onlineUsers.length === 1 ? "member" : "members"} active in the last 15 minutes
          </p>
        </div>
      </main>
    </div>
  );
}
