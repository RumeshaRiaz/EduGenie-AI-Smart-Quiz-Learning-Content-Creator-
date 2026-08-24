import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../src/theme';

/** Shared header styling for every pushed screen. */
const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: '600' as const },
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          <Stack.Screen
            name="question/create"
            options={{ title: 'New Question' }}
          />
          <Stack.Screen
            name="question/edit"
            options={{ title: 'Edit Question' }}
          />
          <Stack.Screen
            name="question/preview"
            options={{ title: 'Preview' }}
          />
          <Stack.Screen
            name="question/generate"
            options={{ title: 'Generate with AI' }}
          />

          <Stack.Screen name="quiz/create" options={{ title: 'New Quiz' }} />
          <Stack.Screen name="quiz/preview" options={{ title: 'Quiz Preview' }} />

          <Stack.Screen name="import/index" options={{ title: 'Import File' }} />
          <Stack.Screen
            name="import/preview"
            options={{ title: 'Extracted Content' }}
          />
          <Stack.Screen
            name="import/generated"
            options={{ title: 'Generated Questions' }}
          />

          <Stack.Screen
            name="voice/record"
            options={{ title: 'Create with Voice', presentation: 'modal' }}
          />
          <Stack.Screen
            name="voice/transcript"
            options={{ title: 'Review Transcript' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
