import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Wine, Users } from "lucide-react";
import type { SoireeMessageWithSender, Profile } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function SuitSoireePage() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: isLoadingMessages } = useQuery<SoireeMessageWithSender[]>({
    queryKey: ["/api/soiree/messages"],
    refetchInterval: 3000,
  });

  const { data: onlineUsers } = useQuery<Profile[]>({
    queryKey: ["/api/whos-on"],
    refetchInterval: 30000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/soiree/messages", { content });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/soiree/messages"] });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Layout backgroundVariant="double-breasted">
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 md:p-6 min-h-0 overflow-hidden">
        <Card className="flex-1 flex flex-col min-h-0 bg-card/95 backdrop-blur-sm border-border">
          <CardHeader className="border-b border-border pb-4 flex flex-row items-center gap-3">
            <Wine className="h-6 w-6 text-accent" />
            <div>
              <CardTitle className="font-serif text-xl text-foreground">The Lounge</CardTitle>
              <p className="text-sm text-muted-foreground">A public gathering for gentlemen</p>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.senderId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        data-testid={`soiree-message-${message.id}`}
                      >
                        <Link href={`/profile/${message.senderId}`}>
                          <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-accent transition-all">
                            {message.senderProfileImageUrl ? (
                              <AvatarImage src={message.senderProfileImageUrl} alt={message.senderName || "User"} className="object-cover" />
                            ) : null}
                            <AvatarFallback className="bg-accent/20 text-accent text-sm">
                              {getInitials(message.senderName)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/profile/${message.senderId}`}>
                              <span className="text-sm font-medium text-accent hover:underline cursor-pointer">
                                {message.senderName || "Unknown"}
                              </span>
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                          <div className={`px-4 py-2 rounded-lg ${
                            isOwn 
                              ? "bg-accent text-accent-foreground" 
                              : "bg-muted text-foreground"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Wine className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-serif">Welcome to the Soiree</p>
                  <p className="text-sm mt-2">Be the first to start the conversation</p>
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your thoughts..."
                  className="flex-1 bg-background border-input"
                  maxLength={1000}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-soiree-message"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-soiree"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full md:w-64 bg-card/95 backdrop-blur-sm border-border flex-shrink-0">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              <CardTitle className="font-serif text-lg">Who's On</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {onlineUsers?.length || 0} gentlemen present
            </p>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-48 md:h-[calc(100vh-20rem)]">
              {onlineUsers && onlineUsers.length > 0 ? (
                <div className="space-y-1">
                  {onlineUsers.map((profile) => (
                    <Link 
                      key={profile.userId} 
                      href={`/profile/${profile.userId}`}
                      className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                      data-testid={`online-user-${profile.userId}`}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-accent/20 text-accent text-xs">
                            {getInitials(profile.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                      </div>
                      <span className="text-sm text-foreground truncate">
                        {profile.displayName || "Unknown"}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No one's on right now</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
