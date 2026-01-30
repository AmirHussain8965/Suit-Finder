import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const ACTIVITY_INTERVAL = 60000;

export function useActivityTracking() {
  const { user } = useAuth();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateActivity = async () => {
      try {
        await apiRequest("POST", "/api/activity");
      } catch (error) {
      }
    };

    updateActivity();

    intervalRef.current = window.setInterval(updateActivity, ACTIVITY_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);
}
