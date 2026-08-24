import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button, Card, ErrorBanner, Screen, Text } from '../../src/ui';
import { colors, radii, shadows, spacing } from '../../src/theme';
import { useSpeechRecognition } from '../../src/services/voice/useSpeechRecognition';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { useVoiceHandoff } from '../../src/store/useVoiceHandoff';
import { formatDuration } from '../../src/utils/format';

/**
 * Voice capture screen.
 *
 * Shows recording state, elapsed time, live transcript, and stop/cancel
 * controls. Nothing is sent to the AI from here — the transcript screen lets
 * the user read and edit the text first.
 */
export default function VoiceRecordScreen() {
  const router = useRouter();
  const locale = useLibraryStore((state) => state.preferences.voiceLocale);
  const setTranscript = useVoiceHandoff((state) => state.set);

  const {
    status,
    transcript,
    durationMs,
    error,
    isAvailable,
    start,
    stop,
    cancel,
    reset,
  } = useSpeechRecognition(locale);

  const isRecording = status === 'recording';
  const isBusy = status === 'requesting' || status === 'stopping';

  // A single slow pulse behind the mic communicates "listening" without the
  // distraction of a continuous animation elsewhere on screen.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isRecording) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse]);

  // Once recognition finishes with usable text, move on to review it.
  useEffect(() => {
    if (status !== 'done') return;
    if (!transcript.trim()) {
      // Recogniser ended without hearing anything; let the user retry.
      reset();
      return;
    }
    setTranscript({ text: transcript, durationMs, locale });
    router.replace('/voice/transcript');
  }, [status, transcript, durationMs, locale, reset, router, setTranscript]);

  const handleMicPress = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRecording) {
      stop();
    } else {
      await start();
    }
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.intro}>
          <Text variant="title" center>
            {isRecording ? 'Listening…' : 'Create with Voice'}
          </Text>
          <Text variant="body" color={colors.textMuted} center>
            {isRecording
              ? 'Speak your question, then tap stop.'
              : isAvailable
                ? 'Tap the microphone and describe the question you want. For example: "Create a math question for a 7 year old — if Ahmed has 8 candies and gives 3 to his brother, how many are left?"'
                : 'Voice recording is unavailable in this build. You can still type your idea below and let AI turn it into a question.'}
          </Text>
        </View>

        <View style={styles.micArea}>
          {isRecording ? (
            <Animated.View
              style={[styles.pulse, { transform: [{ scale }], opacity }]}
            />
          ) : null}

          <Pressable
            onPress={handleMicPress}
            disabled={isBusy || !isAvailable}
            accessibilityRole="button"
            accessibilityLabel={
              isRecording ? 'Stop recording' : 'Start recording'
            }
            accessibilityState={{ busy: isBusy, disabled: !isAvailable }}
            style={({ pressed }) => [
              styles.mic,
              isRecording && styles.micActive,
              pressed && styles.pressed,
              (isBusy || !isAvailable) && styles.micDisabled,
            ]}
          >
            <Text style={styles.micGlyph}>{isRecording ? '⏹' : '🎤'}</Text>
          </Pressable>

          <Text
            variant="heading"
            color={isRecording ? colors.accent : colors.textFaint}
            style={styles.timer}
          >
            {formatDuration(durationMs)}
          </Text>

          {isBusy ? (
            <Text variant="caption" color={colors.textMuted}>
              {status === 'requesting' ? 'Preparing microphone…' : 'Finishing…'}
            </Text>
          ) : null}
        </View>

        {transcript ? (
          <Card>
            <Text variant="label" color={colors.textMuted}>
              RECOGNISED SO FAR
            </Text>
            <Text variant="body" style={styles.transcript}>
              {transcript}
            </Text>
          </Card>
        ) : null}

        {error ? <ErrorBanner message={error} /> : null}

        {!isAvailable ? (
          <Card>
            <Text variant="bodyStrong" color={colors.warning}>
              Voice needs a development build
            </Text>
            <Text
              variant="caption"
              color={colors.textMuted}
              style={styles.transcript}
            >
              Speech recognition is a native module, so it cannot run in Expo
              Go. Run “npx expo run:android” or “npx expo run:ios” to enable it.
            </Text>
            <Button
              label="Type my idea instead"
              icon="✍️"
              variant="secondary"
              onPress={() => router.replace('/question/generate')}
              style={styles.fallbackAction}
            />
          </Card>
        ) : null}
      </View>

      <View style={styles.actions}>
        {isRecording ? (
          <Button label="Stop" icon="⏹" onPress={stop} />
        ) : null}
        <Button
          label={isRecording ? 'Cancel' : 'Close'}
          variant="ghost"
          onPress={() => {
            cancel();
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xl, justifyContent: 'center' },
  intro: { gap: spacing.sm },
  micArea: { alignItems: 'center', gap: spacing.md },
  mic: {
    width: 116,
    height: 116,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  micActive: { backgroundColor: colors.danger },
  micDisabled: { opacity: 0.6 },
  micGlyph: { fontSize: 46 },
  pulse: {
    position: 'absolute',
    top: 0,
    width: 116,
    height: 116,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
  },
  timer: { fontVariant: ['tabular-nums'] },
  transcript: { marginTop: spacing.sm },
  fallbackAction: { marginTop: spacing.md },
  pressed: { opacity: 0.85 },
  actions: { gap: spacing.sm },
});
