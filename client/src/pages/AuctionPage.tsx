import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Gavel, Clock, DollarSign, User, Trophy, Hammer, Trash2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePlatinumFeature } from "@/hooks/use-subscription";
import { PlatinumGate } from "@/components/PremiumGate";
import type { Auction, Bid, WardrobeItem } from "@shared/schema";

interface AuctionWithDetails extends Auction {
  seller: { id: string; displayName: string | null } | null;
  winner: { id: string; displayName: string | null } | null;
  wardrobeItem: WardrobeItem | null;
  bidCount: number;
  highestBid: number | null;
}

interface BidWithBidder extends Bid {
  bidder: { id: string; displayName: string | null } | null;
}

function formatCurrency(amount: number | string | null, isCents: boolean = true): string {
  if (amount === null) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const value = isCents ? num / 100 : num;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatTimeRemaining(endDate: string | Date | null): string {
  if (!endDate) return "No end time";
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff < 0) return "Ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function AuctionPage() {
  const { user } = useAuth();
  const { isPlatinum, isLoading: isPlatinumLoading } = usePlatinumFeature();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<AuctionWithDetails | null>(null);
  const [bidAmount, setBidAmount] = useState("");

  const { data: auctions, isLoading } = useQuery<AuctionWithDetails[]>({
    queryKey: ["/api/auctions"],
    enabled: isPlatinum,
  });

  const { data: bids, isLoading: bidsLoading } = useQuery<BidWithBidder[]>({
    queryKey: ["/api/auctions", selectedAuction?.id, "bids"],
    enabled: !!selectedAuction,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/auctions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      setIsCreating(false);
      toast({ title: "Auction created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create auction", description: err.message, variant: "destructive" });
    },
  });

  const bidMutation = useMutation({
    mutationFn: async ({ auctionId, amount }: { auctionId: number; amount: number }) => {
      return apiRequest("POST", `/api/auctions/${auctionId}/bids`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      if (selectedAuction) {
        queryClient.invalidateQueries({ queryKey: ["/api/auctions", selectedAuction.id, "bids"] });
      }
      setBidAmount("");
      toast({ title: "Bid placed successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to place bid", description: err.message, variant: "destructive" });
    },
  });

  const endMutation = useMutation({
    mutationFn: async (auctionId: number) => {
      return apiRequest("POST", `/api/auctions/${auctionId}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      setSelectedAuction(null);
      toast({ title: "Auction ended successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to end auction", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (auctionId: number) => {
      return apiRequest("DELETE", `/api/auctions/${auctionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      setSelectedAuction(null);
      toast({ title: "Auction deleted successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete auction", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const startingPriceDollars = parseFloat(formData.get("startingPrice") as string);
    const category = formData.get("category") as string || "suits";
    const durationDays = parseInt(formData.get("durationDays") as string) || 7;
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    const startingPriceCents = Math.round(startingPriceDollars * 100);

    createMutation.mutate({
      title,
      description,
      category,
      startingPrice: startingPriceCents,
      currentPrice: startingPriceCents,
      endDate: endDate.toISOString(),
      status: "active",
    });
  };

  const handlePlaceBid = () => {
    if (!selectedAuction || !bidAmount) return;
    const amountDollars = parseFloat(bidAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      toast({ title: "Invalid bid amount", variant: "destructive" });
      return;
    }
    const amountCents = Math.round(amountDollars * 100);
    bidMutation.mutate({ auctionId: selectedAuction.id, amount: amountCents });
  };

  if (isLoading || isPlatinumLoading) {
    return (
      <Layout backgroundVariant="three-piece">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (!isPlatinum) {
    return (
      <Layout backgroundVariant="three-piece">
        <PlatinumGate featureName="Auctions" description="List and bid on exclusive formal wear items with other Platinum members.">
          <div />
        </PlatinumGate>
      </Layout>
    );
  }

  const activeAuctions = auctions?.filter(a => a.status === "active") || [];
  const endedAuctions = auctions?.filter(a => a.status === "ended") || [];
  const myAuctions = auctions?.filter(a => a.sellerId === user?.id) || [];

  return (
    <Layout backgroundVariant="three-piece">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-serif font-semibold">Auctions</h1>
          </div>
          <Button onClick={() => setIsCreating(true)} data-testid="button-create-auction">
            <Plus className="h-4 w-4 mr-2" />
            Create Auction
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Hammer className="h-4 w-4 text-accent" />
              Active Auctions ({activeAuctions.length})
            </h2>
            {activeAuctions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No active auctions at the moment
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeAuctions.map((auction) => (
                  <Card
                    key={auction.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedAuction(auction)}
                    data-testid={`auction-card-${auction.id}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base line-clamp-1">{auction.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{auction.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Current Bid
                        </span>
                        <span className="font-semibold text-accent">
                          {formatCurrency(auction.currentPrice || auction.startingPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Bids
                        </span>
                        <span>{auction.bidCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Time
                        </span>
                        <Badge variant="secondary">{formatTimeRemaining(auction.endDate)}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {endedAuctions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                Ended Auctions ({endedAuctions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {endedAuctions.map((auction) => (
                  <Card
                    key={auction.id}
                    className="cursor-pointer hover-elevate opacity-75"
                    onClick={() => setSelectedAuction(auction)}
                    data-testid={`auction-ended-${auction.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base line-clamp-1 flex-1">{auction.title}</CardTitle>
                        <Badge variant="outline">Ended</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Final Price</span>
                        <span className="font-semibold">{formatCurrency(auction.currentPrice)}</span>
                      </div>
                      {auction.winner && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Winner</span>
                          <span>{auction.winner.displayName || "Anonymous"}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Auction</DialogTitle>
            <DialogDescription>
              List an item for auction. Other Platinum members can bid on it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Vintage Bespoke Suit" required data-testid="input-auction-title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the item..."
                required
                data-testid="input-auction-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startingPrice">Starting Price ($)</Label>
                <Input
                  id="startingPrice"
                  name="startingPrice"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="50.00"
                  required
                  data-testid="input-starting-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  data-testid="select-category"
                >
                  <option value="suits">Suits</option>
                  <option value="jackets">Jackets</option>
                  <option value="shirts">Shirts</option>
                  <option value="ties">Ties</option>
                  <option value="shoes">Shoes</option>
                  <option value="watches">Watches</option>
                  <option value="accessories">Accessories</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input
                id="durationDays"
                name="durationDays"
                type="number"
                min="1"
                max="30"
                defaultValue="7"
                data-testid="input-duration"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-auction">
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Auction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAuction} onOpenChange={() => setSelectedAuction(null)}>
        <DialogContent className="max-w-lg">
          {selectedAuction && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAuction.title}</DialogTitle>
                <DialogDescription>
                  Listed by {selectedAuction.seller?.displayName || "Anonymous"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedAuction.description}</p>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Starting Price</span>
                    <p className="font-semibold">{formatCurrency(selectedAuction.startingPrice)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Bid</span>
                    <p className="font-semibold text-accent">
                      {formatCurrency(selectedAuction.currentPrice || selectedAuction.startingPrice)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Bids</span>
                    <p className="font-semibold">{selectedAuction.bidCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={selectedAuction.status === "active" ? "default" : "secondary"}>
                      {selectedAuction.status}
                    </Badge>
                  </div>
                </div>

                {selectedAuction.status === "active" && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Time Remaining: </span>
                    <span className="font-medium">{formatTimeRemaining(selectedAuction.endDate)}</span>
                  </div>
                )}

                {selectedAuction.status === "ended" && selectedAuction.winner && (
                  <div className="p-3 bg-accent/10 rounded-lg text-sm">
                    <span className="text-muted-foreground">Winner: </span>
                    <span className="font-semibold">{selectedAuction.winner.displayName || "Anonymous"}</span>
                    <br />
                    <span className="text-muted-foreground">Final Price: </span>
                    <span className="font-semibold">{formatCurrency(selectedAuction.currentPrice)}</span>
                  </div>
                )}

                {selectedAuction.status === "active" && selectedAuction.sellerId !== user?.id && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Enter bid amount (in dollars)"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      step="0.01"
                      data-testid="input-bid-amount"
                    />
                    <Button
                      onClick={handlePlaceBid}
                      disabled={bidMutation.isPending || !bidAmount}
                      data-testid="button-place-bid"
                    >
                      {bidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bid"}
                    </Button>
                  </div>
                )}

                {bids && bids.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Bids</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {bids.slice(0, 5).map((bid) => (
                        <div key={bid.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                          <span>{bid.bidder?.displayName || "Anonymous"}</span>
                          <span className="font-medium">{formatCurrency(bid.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAuction.sellerId === user?.id && selectedAuction.status === "active" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => endMutation.mutate(selectedAuction.id)}
                      disabled={endMutation.isPending}
                      data-testid="button-end-auction"
                    >
                      {endMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      End Auction
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(selectedAuction.id)}
                      disabled={deleteMutation.isPending}
                      data-testid="button-delete-auction"
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
