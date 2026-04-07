import { Redirect } from 'expo-router';
import { useSession } from '../src/lib/session';

export default function IndexRoute() {
  const { status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth/sign-in" />;
}
