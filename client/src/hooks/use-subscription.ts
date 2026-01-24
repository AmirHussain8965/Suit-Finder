import { useQuery } from "@tanstack/react-query";

interface SubscriptionStatus {
  isPremium: boolean;
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
    isLoading,
    status: subscription?.status,
    plan: subscription?.plan,
  };
}
