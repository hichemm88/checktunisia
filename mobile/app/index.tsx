import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/** Entry gate — send authenticated users to the tabs, everyone else to login. */
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
