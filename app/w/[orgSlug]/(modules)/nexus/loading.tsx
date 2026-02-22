/**
 * Nexus loading — returns null because the shell lives in the layout
 * (via NexusLayoutShell) and pages return null instantly.
 * The layout's own Suspense shows ModuleLoadingScreen on first load.
 */
export default function NexusLoading() {
  return null;
}
