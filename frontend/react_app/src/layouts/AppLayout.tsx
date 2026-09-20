import { Outlet } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";
import { AppLockGate } from "@/components/LockScreen";
import { AppLockProvider } from "@/contexts/AppLockContext";
import { AppShellProvider } from "@/contexts/AppShellContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function AppLayout() {
  return (
    <ToastProvider>
      <AppShellProvider>
        <AppLockProvider>
          <AppLockGate>
            <div className="min-h-screen bg-app text-app">
              <Header />
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </AppLockGate>
        </AppLockProvider>
      </AppShellProvider>
    </ToastProvider>
  );
}
