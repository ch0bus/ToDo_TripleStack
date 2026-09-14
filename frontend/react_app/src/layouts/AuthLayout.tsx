import { Link } from "react-router-dom";

import { BrandMark } from "@/components/BrandMark";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen flex-col bg-app text-app">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Link
          to="/"
          className="mb-8 flex justify-center hover:opacity-90"
          aria-label="Haloday"
        >
          <BrandMark size="lg" />
        </Link>

        <div className="rounded-xl border border-app bg-app-surface p-6 shadow-app sm:p-8">
          <h1 className="text-2xl font-semibold text-app">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-app-muted">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-app-muted">{footer}</div>
        )}
      </div>
    </main>
  );
}
