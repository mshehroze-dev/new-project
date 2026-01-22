
import { Link } from 'react-router-dom';import { useAuth } from '../auth/AuthProvider';import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Could show a toast notification here in a real app
    }
  };
  return (
    <div className="min-h-screen bg-[rgb(var(--c-bg))] text-[rgb(var(--c-fg))]">
      <nav className="bg-[rgb(var(--c-surface))] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-[rgb(var(--c-fg))]">
                nuvra-landing
              </Link>
            </div>

            <div className="flex items-center space-x-4 z-100">              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-[rgb(var(--c-fg))] hover:text-[rgb(var(--c-fg))] px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>                  <Link
                    to="/ai"
                    className="text-[rgb(var(--c-fg))] hover:text-[rgb(var(--c-fg))] px-3 py-2 rounded-md text-sm font-medium"
                  >
                    AI
                  </Link>                  <Link
                    to="/profile"
                    className="text-[rgb(var(--c-fg))] hover:text-[rgb(var(--c-fg))] px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Profile
                  </Link>                  <Link
                    to="/billing"
                    className="text-[rgb(var(--c-fg))] hover:text-[rgb(var(--c-fg))] px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Billing
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="bg-[rgb(var(--c-primary))] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-[rgb(var(--c-fg))] hover:text-[rgb(var(--c-fg))] px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-[rgb(var(--c-primary))] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Sign up
                  </Link>
                </>
              )}            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
      <Footer />
    </div>
  );
}
