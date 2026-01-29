import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profiles";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import MapPage from "@/pages/MapPage";
import ProfilePage from "@/pages/ProfilePage";
import GalleryPage from "@/pages/GalleryPage";
import MessagesPage from "@/pages/MessagesPage";
import EventsPage from "@/pages/EventsPage";
import PublicEventsPage from "@/pages/PublicEventsPage";
import PublicEventDetailPage from "@/pages/PublicEventDetailPage";
import WardrobePage from "@/pages/WardrobePage";
import AuctionPage from "@/pages/AuctionPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import FavoritesPage from "@/pages/FavoritesPage";
import UserProfilePage from "@/pages/UserProfilePage";
import UserClosetPage from "@/pages/UserClosetPage";
import AboutPage from "@/pages/AboutPage";
import RefundPolicyPage from "@/pages/RefundPolicyPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import WhosOnPage from "@/pages/WhosOnPage";
import SuitSoireePage from "@/pages/SuitSoireePage";
import AdminPage from "@/pages/AdminPage";
import { AgeVerification } from "@/components/AgeVerification";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { useActivityTracking } from "@/hooks/use-activity";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile();

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-accent">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  // Wait for profile to load, but handle 404 (new user with no profile) gracefully
  if (profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-accent">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  // If no profile or not age verified, show age verification
  if (!profile || !profile.ageVerified || profileError) {
    return <AgeVerification />;
  }

  // Check if profile is complete (has display name and profile photo)
  const hasDisplayName = profile.displayName && 
    profile.displayName.trim().length >= 2 && 
    profile.displayName.toLowerCase() !== "unknown";
  const hasProfilePhoto = user?.profileImageUrl;

  if (!hasDisplayName || !hasProfilePhoto) {
    return <ProfileCompletion />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-accent">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to="/map" /> : <Landing />}
      </Route>
      
      <Route path="/auth">
        {user ? <Redirect to="/map" /> : <AuthPage />}
      </Route>

      <Route path="/forgot-password">
        {user ? <Redirect to="/map" /> : <ForgotPasswordPage />}
      </Route>

      <Route path="/reset-password">
        {user ? <Redirect to="/map" /> : <ResetPasswordPage />}
      </Route>

      <Route path="/about">
        <AboutPage />
      </Route>

      <Route path="/refund-policy">
        <RefundPolicyPage />
      </Route>

      <Route path="/privacy">
        <PrivacyPolicyPage />
      </Route>

      <Route path="/verify-age">
        {user ? <AgeVerification /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/map">
        <ProtectedRoute component={MapPage} />
      </Route>

      <Route path="/favorites">
        <ProtectedRoute component={FavoritesPage} />
      </Route>

      <Route path="/whos-on">
        <ProtectedRoute component={WhosOnPage} />
      </Route>
      
      <Route path="/gallery">
        <ProtectedRoute component={GalleryPage} />
      </Route>

      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>

      <Route path="/profile/:userId">
        <ProtectedRoute component={UserProfilePage} />
      </Route>

      <Route path="/closet/:userId">
        <ProtectedRoute component={UserClosetPage} />
      </Route>

      <Route path="/messages">
        <ProtectedRoute component={MessagesPage} />
      </Route>

      <Route path="/soiree">
        <ProtectedRoute component={SuitSoireePage} />
      </Route>

      <Route path="/events/:slug">
        <PublicEventDetailPage />
      </Route>

      <Route path="/events">
        <PublicEventsPage />
      </Route>

      <Route path="/my-events">
        <ProtectedRoute component={EventsPage} />
      </Route>

      <Route path="/wardrobe">
        <ProtectedRoute component={WardrobePage} />
      </Route>

      <Route path="/auctions">
        <ProtectedRoute component={AuctionPage} />
      </Route>

      <Route path="/subscription">
        <ProtectedRoute component={SubscriptionPage} />
      </Route>

      <Route path="/subscription/success">
        <ProtectedRoute component={SubscriptionPage} />
      </Route>

      <Route path="/subscription/cancel">
        <ProtectedRoute component={SubscriptionPage} />
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function ActivityTracker() {
  useActivityTracking();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ActivityTracker />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
