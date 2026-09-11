import { Outlet } from "react-router-dom";

import { Header } from "@/components/Header";
import { AppShellProvider } from "@/contexts/AppShellContext";

export function AppLayout() {
  return (
    <AppShellProvider>
      <div className="min-h-screen bg-slate-900 text-slate-50">
        <Header />
        <Outlet />
      </div>
    </AppShellProvider>
  );
}
