import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, UserCheck, Crown, TrendingUp, Shield, ShieldX } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalUsers: number;
  verifiedProfiles: number;
  premiumSubscribers: number;
  platinumSubscribers: number;
  totalPaidSubscribers: number;
  estimatedMonthlyRevenue: number;
  newUsersThisMonth: number;
}

interface Member {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_tier: string | null;
  created_at: string;
  display_name: string | null;
  age_verified: boolean;
}

export default function AdminPage() {
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const { data: members, isLoading: membersLoading, error: membersError } = useQuery<Member[]>({
    queryKey: ["/api/admin/members"],
    retry: false,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/members/${userId}/subscription`, { tier });
      return response.json();
    },
    onSuccess: (data, { tier }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      const userInfo = data?.user ? ` (${data.user.email}: ${data.user.subscription_tier})` : '';
      toast({
        title: "Subscription Updated",
        description: `Member tier changed to ${tier}${userInfo}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update subscription",
        variant: "destructive",
      });
    },
  });

  const isAccessDenied = (statsError as any)?.message?.includes("403") || 
                          (membersError as any)?.message?.includes("403") ||
                          (statsError as any)?.status === 403 ||
                          (membersError as any)?.status === 403;

  if (isAccessDenied) {
    return (
      <Layout backgroundVariant="double-breasted">
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto bg-card border-border">
            <CardContent className="pt-6 text-center space-y-4">
              <ShieldX className="h-16 w-16 mx-auto text-destructive" />
              <h2 className="text-xl font-serif font-bold text-foreground">Access Denied</h2>
              <p className="text-muted-foreground">
                This page is only accessible to site administrators.
              </p>
              <Link href="/map">
                <Button className="bg-accent text-accent-foreground" data-testid="button-back-to-map">
                  Return to Map
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTierBadge = (tier: string | null, status: string | null) => {
    if (status !== 'active') {
      return <Badge variant="outline" className="text-muted-foreground">Free</Badge>;
    }
    if (tier === 'platinum') {
      return <Badge className="bg-amber-500 text-white">Platinum</Badge>;
    }
    if (tier === 'premium') {
      return <Badge className="bg-accent text-accent-foreground">Premium</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Free</Badge>;
  };

  return (
    <Layout backgroundVariant="double-breasted">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-8">
          <div className="flex items-center gap-3 border-b border-border pb-6">
            <Shield className="h-8 w-8 text-accent" />
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                View member activity and revenue statistics
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.newUsersThisMonth || 0} new this month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Verified Profiles</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.verifiedProfiles || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Age verified (21+)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Paid Subscribers</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalPaidSubscribers || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.premiumSubscribers || 0} premium, {stats?.platinumSubscribers || 0} platinum
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-green-500">
                    {formatCurrency(stats?.estimatedMonthlyRevenue || 0)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated recurring
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-serif text-accent flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                All Members
              </CardTitle>
              <CardDescription>
                Complete list of registered members and their subscription status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : members && members.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                          <TableCell className="font-medium">
                            {member.display_name || member.first_name || 'Anonymous'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.email || 'No email'}
                          </TableCell>
                          <TableCell>
                            {member.age_verified ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={member.subscription_status === 'active' && member.subscription_tier ? member.subscription_tier : 'free'}
                              onValueChange={(value) => updateSubscriptionMutation.mutate({ userId: member.id, tier: value })}
                              disabled={updateSubscriptionMutation.isPending}
                            >
                              <SelectTrigger className="w-[130px]" data-testid={`select-tier-${member.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="platinum">Platinum</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.created_at ? formatDate(member.created_at) : 'Unknown'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No members yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
