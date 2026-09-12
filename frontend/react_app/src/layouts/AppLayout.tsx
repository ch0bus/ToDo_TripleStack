import { Outlet } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";
import { AppShellProvider } from "@/contexts/AppShellContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function AppLayout() {
  return (
    <ToastProvider>
      <AppShellProvider>
        <div className="min-h-screen bg-app text-app">
          <Header />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </AppShellProvider>
    </ToastProvider>
  );
}
