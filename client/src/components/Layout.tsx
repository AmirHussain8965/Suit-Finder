import { ReactNode } from "react";
import { Navigation } from "./Navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      <Navigation />
      <main className="flex-1 md:ml-64 relative flex flex-col h-full min-w-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
