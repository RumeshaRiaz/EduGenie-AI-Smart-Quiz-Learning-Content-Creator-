/**
 * The voice hook must load even when the native speech module is missing,
 * which is the situation in Expo Go. A static import there throws while the
 * module is being evaluated and takes down the whole bundle.
 */

describe('without the native speech module', () => {
  beforeEach(() => {
    jest.resetModules();
    // Simulate Expo Go: requiring the native module throws.
    jest.doMock('expo-speech-recognition', () => {
      throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
    });
  });

  afterEach(() => {
    jest.dontMock('expo-speech-recognition');
  });

  it('imports the hook module without throwing', () => {
    expect(() => {
      require('../src/services/voice/useSpeechRecognition');
    }).not.toThrow();
  });

  it('exports a usable hook', () => {
    const { useSpeechRecognition } = require('../src/services/voice/useSpeechRecognition');
    expect(typeof useSpeechRecognition).toBe('function');
  });
});

describe('with the native speech module present', () => {
  it('imports normally', () => {
    jest.resetModules();
    expect(() => {
      require('../src/services/voice/useSpeechRecognition');
    }).not.toThrow();
  });
});
