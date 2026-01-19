import { ReactNode } from "react";
import { Navigation } from "./Navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <Navigation />
      <main className="flex-1 md:ml-64 relative overflow-hidden flex flex-col min-h-screen pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
