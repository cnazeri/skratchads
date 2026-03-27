"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const isAuthPage = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (isAuthPage) return;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setUser({
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name,
      });
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser({
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthPage, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Auth pages: no nav, no footer
  if (isAuthPage) {
    return <>{children}</>;
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-200 backdrop-blur-lg bg-white/70">
        <div className="max-w-[1100px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">SkratchAds™</h1>
            <span className="text-sm text-gray-600">Banner Buddy</span>
          </div>

          <div className="flex gap-8">
            <a href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-500 transition-colors">
              Dashboard
            </a>
            <a href="/creatives" className="text-sm font-medium text-gray-700 hover:text-blue-500 transition-colors">
              Creatives
            </a>
            <a href="/campaign/new" className="text-sm font-medium text-gray-700 hover:text-blue-500 transition-colors">
              New Campaign
            </a>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full bg-blue-500 text-white font-semibold text-sm flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              {initials}
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-[1100px] mx-auto px-8 py-6 text-center text-sm text-gray-500">
          © 2026 SkratchAds™
        </div>
      </footer>
    </>
  );
}
