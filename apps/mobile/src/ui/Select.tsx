import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { MIN_TOUCH, colors, radii, spacing } from '../theme';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shows a search field once the list is long. */
  searchable?: boolean;
  /** Lets the user type a value that is not in the list (custom subjects). */
  allowCustom?: boolean;
  customLabel?: string;
}

/** Field that opens a bottom sheet to pick one value. */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchable = false,
  allowCustom = false,
  customLabel = 'Add custom',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');

  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setCustom('');
  };

  const commitCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    onChange(trimmed);
    close();
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" color={colors.textMuted}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityValue={{ text: selected?.label ?? value ?? placeholder }}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text
          variant="body"
          color={selected || value ? colors.text : colors.textFaint}
          numberOfLines={1}
          style={styles.fieldText}
        >
          {selected?.label ?? value ?? placeholder}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          ▾
        </Text>
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={close}
        title={label ? `Select ${label.toLowerCase()}` : 'Select'}
      >
        {searchable ? (
          <Input
            placeholder="Search…"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            containerStyle={styles.search}
          />
        ) : null}

        <FlatList
          data={visible}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          ListEmptyComponent={
            <Text
              variant="caption"
              color={colors.textMuted}
              style={styles.empty}
            >
              No matches.
            </Text>
          }
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  variant={active ? 'bodyStrong' : 'body'}
                  color={active ? colors.primary : colors.text}
                >
                  {item.label}
                </Text>
                {active ? (
                  <Text variant="bodyStrong" color={colors.primary}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
        />

        {allowCustom ? (
          <View style={styles.customRow}>
            <Input
              placeholder={customLabel}
              value={custom}
              onChangeText={setCustom}
              onSubmitEditing={commitCustom}
              returnKeyType="done"
              containerStyle={styles.customInput}
            />
            <Pressable
              onPress={commitCustom}
              accessibilityRole="button"
              accessibilityLabel={customLabel}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Text variant="bodyStrong" color={colors.onPrimary}>
                Add
              </Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  field: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  fieldText: { flex: 1 },
  pressed: { opacity: 0.75 },
  search: { marginBottom: spacing.sm },
  list: { maxHeight: 320 },
  row: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  rowActive: { backgroundColor: colors.primarySoft },
  empty: { padding: spacing.lg, textAlign: 'center' },
  customRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  customInput: { flex: 1 },
  addButton: {
    height: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
