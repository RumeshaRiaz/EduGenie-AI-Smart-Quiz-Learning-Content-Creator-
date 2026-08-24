/* Test environment setup: stub the native modules that have no JS
   implementation under Jest, so component tests exercise real app code. */

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn(async (key, value) => { store.set(key, value); }),
      removeItem: jest.fn(async (key) => { store.delete(key); }),
      clear: jest.fn(async () => { store.clear(); }),
    },
  };
});

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
