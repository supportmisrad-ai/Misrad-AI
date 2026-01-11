'use client';

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LoginView } from "../views/LoginView";
import { useEffect, useState } from "react";
import { getUserPurchasedModules } from "../lib/user-subscription";
import { OSModuleInfo, OS_MODULES } from "../types/os-modules";
import { OSSelectionScreen } from "../components/shared/OSSelectionScreen";

type WorkspaceApiItem = {
  id: string;
  slug: string;
  name: string;
};

type LastLocationApiResponse = {
  orgSlug: string | null;
  module: string | null;
};

export default function RootPageClient({ initialUserId }: { initialUserId: string | null }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [purchasedModulesInfo, setPurchasedModulesInfo] = useState<OSModuleInfo[]>([]);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) {
      return;
    }

    // If user is signed in, show OS selection or redirect
    if (isSignedIn && userId) {
      const load = async () => {
        try {
          const [purchasedModules, workspacesResponse, lastLocationResponse] = await Promise.all([
            getUserPurchasedModules(userId),
            fetch('/api/workspaces', { cache: 'no-store' }).catch(() => null),
            fetch('/api/user/last-location', { cache: 'no-store' }).catch(() => null),
          ]);

          const workspacesJson = workspacesResponse && workspacesResponse.ok
            ? await workspacesResponse.json()
            : { workspaces: [] as WorkspaceApiItem[] };
          const workspaces = (workspacesJson?.workspaces || []) as WorkspaceApiItem[];

          const lastLocationJson: LastLocationApiResponse =
            lastLocationResponse && lastLocationResponse.ok
              ? await lastLocationResponse.json()
              : ({ orgSlug: null, module: null } as LastLocationApiResponse);

          const lastOrgSlug = lastLocationJson?.orgSlug ? String(lastLocationJson.orgSlug) : null;
          const hasLastOrg = Boolean(lastOrgSlug && workspaces.some((w) => String(w.slug) === String(lastOrgSlug)));

          const resolvedOrgSlug: string | null =
            (hasLastOrg ? lastOrgSlug : null) || (workspaces[0]?.slug ? String(workspaces[0].slug) : null);

          setOrgSlug(resolvedOrgSlug);

          const modulesInfo = OS_MODULES.filter(m => 
            purchasedModules.includes(m.id) && m.purchased
          );
          setPurchasedModulesInfo(modulesInfo);
          setIsLoadingModules(false);

          // Workspace selection logic (business-level):
          // - If we have a saved last workspace and the user still has access -> go there.
          // - Else if the user has only one workspace -> go there.
          // - Else fallback to first workspace (until we add a dedicated workspace picker UI).
          if (workspaces.length > 0) {
            if (hasLastOrg && lastOrgSlug) {
              router.push(`/w/${encodeURIComponent(lastOrgSlug)}`);
              return;
            }

            if (workspaces.length === 1 && workspaces[0]?.slug) {
              router.push(`/w/${encodeURIComponent(String(workspaces[0].slug))}`);
              return;
            }

            if (workspaces[0]?.slug) {
              router.push(`/w/${encodeURIComponent(String(workspaces[0].slug))}`);
              return;
            }
          }

          if (modulesInfo.length === 0) {
            router.push("/");
            return;
          }

          // If only one OS, redirect directly to it only if we can resolve the orgSlug.
          if (modulesInfo.length === 1) {
            const route = modulesInfo[0].route;
            if (route.includes('[orgSlug]')) {
              if (resolvedOrgSlug) {
                router.push(route.replace('[orgSlug]', encodeURIComponent(resolvedOrgSlug)));
              }
              return;
            }
            router.push(route);
          }
        } catch (error) {
          console.error('Error getting user modules:', error);
          setIsLoadingModules(false);
          const allPurchased = OS_MODULES.filter(m => m.purchased);
          setPurchasedModulesInfo(allPurchased);
        }
      };

      load();
    } else {
      // User is not signed in - show login screen
      setIsLoadingModules(false);
    }
  }, [isSignedIn, isLoaded, userId, router]);

  // Show loading state while Clerk is loading or checking modules
  if (!isLoaded || isLoadingModules) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">טוען...</p>
        </div>
      </div>
    );
  }

  // If user is signed in
  if (isSignedIn) {
    // If only one OS, redirect will happen in useEffect (already handled)
    if (purchasedModulesInfo.length === 1) {
      return null; // Redirecting...
    }
    
    // If multiple OS, show selection screen
    if (purchasedModulesInfo.length > 1) {
      return (
        <OSSelectionScreen
          purchasedModules={purchasedModulesInfo}
          orgSlug={orgSlug ?? undefined}
          onSelectOS={(module) => {
            // Navigate directly to OS (no login needed - already logged in)
            if (!module.route.includes('[orgSlug]')) {
              router.push(module.route);
              return;
            }
            if (!orgSlug) {
              return;
            }
            router.push(module.route.replace('[orgSlug]', encodeURIComponent(orgSlug)));
          }}
        />
      );
    }
    
    // If no OS, redirect will happen in useEffect
    return null;
  }

  // Show login screen - after login, user will see OS selection
  return (
    <LoginView />
  );
}
