import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      return { success: false, error: 'Authentication failed' };
    }
  };

  const logout = async () => {
    try {
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

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    login,
    logout,
    register,
    session,
  };
}

export default useAuth;