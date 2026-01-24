import { useQuery } from "@tanstack/react-query";

export type SubscriptionTier = 'free' | 'premium' | 'platinum';

interface SubscriptionStatus {
  isPremium: boolean;
  isPlatinum: boolean;
  tier: SubscriptionTier;
  status: string | null;
  plan: string | null;
  endDate: string | null;
}

export function useSubscription() {
  return useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription"],
  });
}

export function usePremiumFeature() {
  const { data: subscription, isLoading } = useSubscription();
  
  return {
    isPremium: subscription?.isPremium ?? false,
    isPlatinum: subscription?.isPlatinum ?? false,
    tier: subscription?.tier ?? 'free',
    isLoading,
    status: subscription?.status,
    plan: subscription?.plan,
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
