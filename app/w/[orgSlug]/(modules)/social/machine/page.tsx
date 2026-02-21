import TheMachine from '@/components/social/TheMachine';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls


export default async function MachinePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <TheMachine />
    </div>
  );
}
