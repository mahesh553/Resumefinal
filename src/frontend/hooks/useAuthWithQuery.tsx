import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useCallback, useEffect } from 'react';

// Auth-related query keys
export const authKeys = {
  user: ['auth', 'user'] as const,
  session: ['auth', 'session'] as const,
};

export function useAuthWithQuery() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Clear all queries when user logs out
  const clearQueriesOnLogout = useCallback(() => {
    queryClient.clear();
    // Optionally, you can be more selective:
    // queryClient.removeQueries({ predicate: (query) => 
    //   query.queryKey[0] !== 'public' // Keep public data
    // });
  }, [queryClient]);

  // Clear queries when session becomes null
  useEffect(() => {
    if (status !== 'loading' && !session) {
      clearQueriesOnLogout();
    }
  }, [session, status, clearQueriesOnLogout]);

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid credentials. Please try again.');
        return { success: false, error: result.error };
      }

      toast.success('Welcome back!');
      
      // Prefetch user data after successful login
      queryClient.prefetchQuery({
        queryKey: authKeys.user,
        queryFn: () => session?.user,
      });
      
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      return { success: false, error: 'Authentication failed' };
    }
  };

  const logout = async () => {
    try {
      // Clear all query cache before signing out
      clearQueriesOnLogout();
      
      await signOut({ redirect: false });
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        toast.success('Account created successfully! Please sign in.');
        router.push('/auth/login');
        return { success: true };
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create account');
        return { success: false, error: error.error };
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      return { success: false, error: 'Registration failed' };
    }
  };

  // Session as a query for consistency
  const sessionQuery = useQuery({
    queryKey: authKeys.session,
    queryFn: () => session,
    enabled: status !== 'loading',
    staleTime: Infinity, // Never stale, managed by NextAuth
    gcTime: Infinity, // Never garbage collect
  });

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    login,
    logout,
    register,
    session,
    sessionQuery,
    queryClient, // Expose for manual cache management
  };
}

// Higher-order component to protect routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthWithQuery();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}

export default useAuthWithQuery;