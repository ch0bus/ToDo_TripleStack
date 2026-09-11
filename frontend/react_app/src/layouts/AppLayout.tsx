import { Outlet } from "react-router-dom";

import { Header } from "@/components/Header";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <Header />
      <Outlet />
    </div>
  );
}
