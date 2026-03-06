import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';

export default function AdminPanel() {
  const { data: session, status } = useSession({ required: true });
  const { data: subscription } = trpc.subscription.current.useQuery(undefined, {
    enabled: !!session,
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              {session?.user?.email}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">

          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <p className="text-sm font-medium text-gray-500 truncate">Signed-in user</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {session?.user?.name ?? session?.user?.email}
                  </p>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <p className="text-sm font-medium text-gray-500 truncate">Subscription status</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {subscription ? (
                      <span className="text-green-600 capitalize">{subscription.status}</span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <p className="text-sm font-medium text-gray-500 truncate">Current period end</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {subscription?.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              {[
                { href: '/dashboard', label: 'User Dashboard', description: 'View your personal stats' },
                { href: '/api/auth/signout', label: 'Sign Out', description: 'End your session' },
              ].map(({ href, label, description }) => (
                <div key={href} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <Link
                    href={href}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Go →
                  </Link>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
