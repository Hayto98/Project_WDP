import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function UserLayout() {
  const { theme } = useTheme();
  return (
    <Stack screenOptions={{ 
      headerShown: true,
      headerStyle: { backgroundColor: theme.surface },
      headerTintColor: theme.ink,
      headerTitleStyle: { fontWeight: 'bold' }
    }}>
      <Stack.Screen name="paper/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
