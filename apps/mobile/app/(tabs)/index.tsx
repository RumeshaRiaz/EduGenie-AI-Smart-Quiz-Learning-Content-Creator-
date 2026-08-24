import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  QuestionCard,
  QuizCard,
  Screen,
  Text,
} from '../../src/ui';
import { colors, radii, shadows, spacing } from '../../src/theme';
import { useLibraryStore } from '../../src/store/useLibraryStore';

/** A large, primary way to start creating. */
function ActionTile({
  glyph,
  title,
  caption,
  onPress,
  tint,
  tintSoft,
  wide = false,
}: {
  glyph: string;
  title: string;
  caption: string;
  onPress: () => void;
  tint: string;
  tintSoft: string;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={caption}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tintSoft },
        wide && styles.tileWide,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.tileGlyph}>{glyph}</Text>
      <Text variant="bodyStrong" color={tint}>
        {title}
      </Text>
      <Text variant="caption" color={colors.textMuted}>
        {caption}
      </Text>
    </Pressable>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <Text variant="display" color={colors.primary}>
        {value}
      </Text>
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const questions = useLibraryStore((state) => state.questions);
  const quizzes = useLibraryStore((state) => state.quizzes);

  const recentQuestions = questions.slice(0, 3);
  const recentQuizzes = quizzes.slice(0, 2);

  return (
    <Screen scroll contentStyle={{ paddingTop: insets.top + spacing.lg }}>
      <View style={styles.header}>
        <Text variant="display">EduGenie AI</Text>
        <Text variant="body" color={colors.textMuted}>
          Create smarter learning content.
        </Text>
      </View>

      {/* Voice is the signature feature, so it gets the full-width tile. */}
      <ActionTile
        glyph="🎤"
        title="Create with Voice"
        caption="Say your idea and let AI shape the question"
        onPress={() => router.push('/voice/record')}
        tint={colors.accent}
        tintSoft={colors.accentSoft}
        wide
      />

      <View style={styles.tileRow}>
        <ActionTile
          glyph="✍️"
          title="Create Question"
          caption="Write it yourself"
          onPress={() => router.push('/question/create')}
          tint={colors.primary}
          tintSoft={colors.primarySoft}
        />
        <ActionTile
          glyph="📄"
          title="Import File"
          caption="TXT, CSV, PDF, DOCX"
          onPress={() => router.push('/import')}
          tint={colors.success}
          tintSoft={colors.successSoft}
        />
      </View>

      <ActionTile
        glyph="✨"
        title="Generate with AI"
        caption="Describe a topic and let AI draft the question"
        onPress={() => router.push('/question/generate')}
        tint={colors.primaryDark}
        tintSoft={colors.primarySoft}
        wide
      />

      <View style={styles.statRow}>
        <StatCard value={questions.length} label="Questions" />
        <StatCard value={quizzes.length} label="Quizzes" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="heading">Recent Questions</Text>
          {questions.length > 0 ? (
            <Pressable
              onPress={() => router.push('/questions')}
              accessibilityRole="button"
              accessibilityLabel="See all questions"
            >
              <Text variant="caption" color={colors.primary}>
                See all
              </Text>
            </Pressable>
          ) : null}
        </View>

        {recentQuestions.length === 0 ? (
          <Card>
            <Text variant="body" color={colors.textMuted}>
              No questions yet. Tap Create with Voice, write one yourself, or
              import a file to get started.
            </Text>
          </Card>
        ) : (
          recentQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onPress={() =>
                router.push({
                  pathname: '/question/preview',
                  params: { id: question.id },
                })
              }
            />
          ))
        )}
      </View>

      {recentQuizzes.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="heading">Recent Quizzes</Text>
            <Pressable
              onPress={() => router.push('/quizzes')}
              accessibilityRole="button"
              accessibilityLabel="See all quizzes"
            >
              <Text variant="caption" color={colors.primary}>
                See all
              </Text>
            </Pressable>
          </View>
          {recentQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onPress={() =>
                router.push({ pathname: '/quiz/preview', params: { id: quiz.id } })
              }
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  tileRow: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 128,
    justifyContent: 'center',
    ...shadows.sm,
  },
  tileWide: { minHeight: 112 },
  tileGlyph: { fontSize: 28, marginBottom: spacing.xs },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
