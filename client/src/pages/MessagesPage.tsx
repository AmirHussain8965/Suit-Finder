import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Users, Plus, ArrowLeft, MessageSquare, Megaphone } from "lucide-react";
import type { ConversationWithParticipants, MessageWithSender } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useNearbyProfiles } from "@/hooks/use-profiles";
import { usePremiumFeature } from "@/hooks/use-subscription";
import { PremiumGate } from "@/components/PremiumGate";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function MessagesPage() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { isPremium, isAdmin, isLoading: isPremiumLoading, tier, messagesRemaining, messageLimit, refetch: refetchSubscription } = usePremiumFeature();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [messageLimitError, setMessageLimitError] = useState<string | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isLoadingConversations } = useQuery<ConversationWithParticipants[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery<MessageWithSender[]>({
    queryKey: [`/api/conversations/${selectedConversationId}/messages`],
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  const { data: nearbyUsers } = useNearbyProfiles(0, 0, 1000);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, { content });
      return response;
    },
    onSuccess: () => {
      setNewMessage("");
      setMessageLimitError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      // Refetch subscription to update remaining message count
      if (tier === 'free') {
        refetchSubscription();
      }
    },
    onError: (error: any) => {
      if (error?.code === 'MESSAGE_LIMIT_REACHED' || error?.message?.includes('Free members can send')) {
        setMessageLimitError(error.message || 'Daily message limit reached. Upgrade for unlimited messaging.');
      }
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { participantIds: string[]; name: string; isGroup: boolean }) => {
      const res = await apiRequest("POST", "/api/conversations", data);
      return res.json();
    },
    onSuccess: (data: { id: number }) => {
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedParticipants([]);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (data?.id) {
        setSelectedConversationId(data.id);
      }
    },
  });

  const startDirectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", buildUrl("/api/conversations/direct/:userId", { userId }));
      return res.json();
    },
    onSuccess: (data: { id: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (data?.id) {
        setSelectedConversationId(data.id);
      }
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/admin/broadcast", { content });
      return response.json();
    },
    onSuccess: (data: { message: string; sentCount: number }) => {
      setIsBroadcastOpen(false);
      setBroadcastMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Broadcast Sent",
        description: `Message sent to ${data.sentCount} members`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Broadcast Failed",
        description: error?.message || "Failed to send broadcast",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConversationId) {
      markReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversationId) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleCreateGroup = () => {
    if (selectedParticipants.length > 0 && groupName.trim()) {
      createGroupMutation.mutate({
        participantIds: selectedParticipants,
        name: groupName.trim(),
        isGroup: true,
      });
    }
  };

  const getConversationName = (conversation: ConversationWithParticipants) => {
    if (conversation.name) return conversation.name;
    const otherParticipants = conversation.participants.filter(p => p.userId !== currentUserId);
    if (otherParticipants.length === 0) return "Just You";
    return otherParticipants.map(p => p.displayName || "Unknown").join(", ");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  if (isLoadingConversations || isPremiumLoading) {
    return (
      <Layout backgroundVariant="tuxedo">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  
  return (
    <Layout backgroundVariant="tuxedo">
      <div className="flex h-full w-full no-screenshot">
        {/* Conversation List - hide on mobile when conversation selected */}
        <div className={`w-full md:w-80 border-r border-border flex flex-col bg-card ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h2 className="text-lg font-serif font-semibold text-accent">Messages</h2>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      data-testid="button-broadcast-all"
                    >
                      <Megaphone className="h-4 w-4 mr-1" />
                      ALL
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="no-screenshot">
                    <DialogHeader>
                      <DialogTitle>Broadcast to All Members</DialogTitle>
                      <DialogDescription>
                        Send a message to everyone on the site. This will create individual conversations with each member.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Type your broadcast message..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="min-h-[120px]"
                        data-testid="input-broadcast-message"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBroadcastOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => broadcastMutation.mutate(broadcastMessage)}
                        disabled={!broadcastMessage.trim() || broadcastMutation.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        data-testid="button-send-broadcast"
                      >
                        {broadcastMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send to All
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-new-group">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
              <DialogContent className="no-screenshot">
                <DialogHeader>
                  <DialogTitle>Create Group Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    data-testid="input-group-name"
                  />
                  <div className="text-sm text-muted-foreground">Select participants:</div>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    {nearbyUsers?.map((user) => (
                      <div
                        key={user.userId}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover-elevate ${
                          selectedParticipants.includes(user.userId) ? "bg-accent/20" : ""
                        }`}
                        onClick={() => {
                          setSelectedParticipants(prev =>
                            prev.includes(user.userId)
                              ? prev.filter(id => id !== user.userId)
                              : [...prev, user.userId]
                          );
                        }}
                        data-testid={`participant-${user.userId}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-accent text-xs">
                            {getInitials(user.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.displayName || "Unknown"}</span>
                      </div>
                    ))}
                  </ScrollArea>
                  <Button
                    className="w-full"
                    onClick={handleCreateGroup}
                    disabled={selectedParticipants.length === 0 || !groupName.trim() || createGroupMutation.isPending}
                    data-testid="button-create-group"
                  >
                    {createGroupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    Create Group ({selectedParticipants.length} selected)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversations && conversations.length > 0 ? (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 cursor-pointer border-b border-border hover-elevate ${
                    selectedConversationId === conversation.id ? "bg-accent/10" : ""
                  }`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  data-testid={`conversation-${conversation.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-accent">
                          {conversation.isGroup ? <Users className="h-5 w-5" /> : getInitials(getConversationName(conversation))}
                        </AvatarFallback>
                      </Avatar>
                      {(conversation.unreadCount ?? 0) > 0 && (
                        <span 
                          className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-card"
                          data-testid={`unread-dot-${conversation.id}`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium truncate ${(conversation.unreadCount ?? 0) > 0 ? 'text-foreground' : ''}`}>{getConversationName(conversation)}</span>
                        {(conversation.unreadCount ?? 0) > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.content || "[Photo]"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-2">Start a chat from someone's profile</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message View */}
        <div className={`flex-1 flex flex-col bg-background ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
                <Button
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => setSelectedConversationId(null)}
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {(() => {
                  const otherParticipant = !selectedConversation.isGroup 
                    ? selectedConversation.participants.find(p => p.userId !== currentUserId)
                    : null;
                  const conversationName = getConversationName(selectedConversation);
                  
                  return (
                    <>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-accent">
                          {selectedConversation.isGroup ? <Users className="h-5 w-5" /> : getInitials(conversationName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        {otherParticipant ? (
                          <Link 
                            href={`/profile/${otherParticipant.userId}`}
                            className="font-medium hover:text-accent hover:underline"
                            data-testid="link-conversation-profile"
                          >
                            {conversationName}
                          </Link>
                        ) : (
                          <h3 className="font-medium">{conversationName}</h3>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.participants.length} participant{selectedConversation.participants.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 no-screenshot">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.senderId === currentUserId;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div className={`max-w-[70%] ${isOwn ? "order-2" : ""}`}>
                            {!isOwn && message.sender && (
                              <Link 
                                href={`/profile/${message.senderId}`}
                                className="text-xs text-muted-foreground mb-1 hover:text-accent hover:underline cursor-pointer block"
                                data-testid={`link-sender-${message.senderId}`}
                              >
                                {message.sender.displayName || "Unknown"}
                              </Link>
                            )}
                            <div
                              className={`p-3 rounded-lg ${
                                isOwn
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-card border border-border"
                              }`}
                            >
                              {message.imageUrl && (
                                <img
                                  src={message.imageUrl}
                                  alt="Shared"
                                  className="max-w-full rounded mb-2 no-screenshot"
                                  style={{ pointerEvents: "none" }}
                                />
                              )}
                              {message.content && <p className="text-sm">{message.content}</p>}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {message.createdAt && new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No messages yet. Say hi!</p>
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-border bg-card">
                {/* Free tier message limit warning */}
                {tier === 'free' && messagesRemaining !== null && messagesRemaining !== undefined && (
                  <div className={`mb-2 text-xs p-2 rounded ${messagesRemaining === 0 ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-muted-foreground'}`}>
                    {messagesRemaining === 0 ? (
                      <span>Message limit reached. <Link href="/membership" className="underline text-accent">Upgrade</Link> for unlimited messaging.</span>
                    ) : (
                      <span>{messagesRemaining} of {messageLimit} free messages remaining (resets every 2 days)</span>
                    )}
                  </div>
                )}
                {/* Message limit error */}
                {messageLimitError && (
                  <div className="mb-2 text-xs p-2 rounded bg-destructive/10 text-destructive">
                    {messageLimitError} <Link href="/membership" className="underline text-accent">Upgrade now</Link>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder={tier === 'free' && messagesRemaining === 0 ? "Upgrade to send more messages..." : "Type a message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendMessageMutation.isPending || (tier === 'free' && messagesRemaining === 0)}
                    data-testid="input-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending || (tier === 'free' && messagesRemaining === 0)}
                    data-testid="button-send"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
