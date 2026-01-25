import { ReactNode } from "react";
import { Navigation } from "./Navigation";
import { SuitedSilhouettes } from "./SuitedSilhouettes";

interface LayoutProps {
  children: ReactNode;
  hideSilhouettes?: boolean;
  backgroundVariant?: "tuxedo" | "double-breasted" | "three-piece" | "auction" | "wardrobe";
}

export function Layout({ children, hideSilhouettes = false, backgroundVariant = "tuxedo" }: LayoutProps) {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden no-screenshot">
      <Navigation />
      {!hideSilhouettes && <SuitedSilhouettes variant={backgroundVariant} />}
      <main className="flex-1 md:ml-64 relative flex flex-col h-full min-w-0 pb-16 md:pb-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
