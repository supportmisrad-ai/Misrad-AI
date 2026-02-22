/**
 * Nexus home page — intentionally returns null.
 * The shell (NexusModuleClient → NexusWorkspaceApp) lives in the layout
 * via NexusLayoutShell and uses usePathname() for client-side routing.
 * This page only exists so Next.js recognises the /nexus route.
 */
export default function NexusModuleHome() {
  return null;
}
