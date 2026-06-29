import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import fridgyLogo from "../assets/fridgy-logo.jpeg.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { hydrateFromProfile, schedulePushProfile, clearLocalSession } from "@/lib/auth-sync";
import "../lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page introuvable</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Oups, ça a planté</h1>
        <p className="mt-2 text-sm text-muted-foreground">Essayez à nouveau.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Fridgy — Cuisinez avec ce que vous avez" },
      {
        name: "description",
        content:
          "Fridgy génère des recettes équilibrées à partir des ingrédients de votre frigo.",
      },
      { name: "theme-color", content: "#2D8B57" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: fridgyLogo.url },
      { rel: "apple-touch-icon", href: fridgyLogo.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const loc = useLocation();
  const nav = useNavigate();
  const hideNav = loc.pathname === "/onboarding" || loc.pathname === "/auth";

  // Auth gate + session sync
  useEffect(() => {
    let booted = false;

    const apply = async (hasSession: boolean) => {
      const path = window.location.pathname;
      if (hasSession) {
        const u = await hydrateFromProfile();
        if (path === "/auth") {
          nav({ to: u?.program ? "/" : "/onboarding", replace: true });
        }
      } else {
        clearLocalSession();
        if (path !== "/auth") nav({ to: "/auth", replace: true });
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      booted = true;
      void apply(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!booted) return;
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void apply(!!session);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [nav]);

  // Mirror local profile edits to the database
  useEffect(() => {
    const onChange = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      if (key === "fridgechef_session_user") schedulePushProfile();
    };
    window.addEventListener("fridgechef:change", onChange);
    return () => window.removeEventListener("fridgechef:change", onChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto min-h-screen max-w-md" style={{ paddingBottom: hideNav ? 0 : 80 }}>
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
