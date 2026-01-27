import { useQuery } from "@tanstack/react-query";

export type SubscriptionTier = 'free' | 'premium' | 'platinum';

interface SubscriptionStatus {
  isPremium: boolean;
  isPlatinum: boolean;
  isAdmin: boolean;
  tier: SubscriptionTier;
  status: string | null;
  plan: string | null;
  endDate: string | null;
  messagesRemaining: number | null;
  messageLimit: number | null;
}

export function useSubscription() {
  return useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription"],
    staleTime: 0, // Always refetch subscription status to get fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

export function usePremiumFeature() {
  const { data: subscription, isLoading, refetch } = useSubscription();
  
  return {
    isPremium: subscription?.isPremium ?? false,
    isPlatinum: subscription?.isPlatinum ?? false,
    isAdmin: subscription?.isAdmin ?? false,
    tier: subscription?.tier ?? 'free',
    isLoading,
    status: subscription?.status,
    plan: subscription?.plan,
    messagesRemaining: subscription?.messagesRemaining,
    messageLimit: subscription?.messageLimit,
    refetch,
  };
}

export function usePlatinumFeature() {
  const { data: subscription, isLoading } = useSubscription();
  
  return {
    isPlatinum: subscription?.isPlatinum ?? false,
    tier: subscription?.tier ?? 'free',
    isLoading,
    status: subscription?.status,
    plan: subscription?.plan,
  };
}
