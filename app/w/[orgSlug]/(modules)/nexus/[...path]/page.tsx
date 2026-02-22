/**
 * Nexus catch-all page — intentionally returns null.
 * The shell (NexusModuleClient → NexusWorkspaceApp) lives in the layout
 * via NexusLayoutShell and uses usePathname() for client-side routing.
 * This catch-all exists so that direct-URL access to /nexus/tasks etc. works.
 */
export default function NexusCatchAllPage() {
  return null;
}
