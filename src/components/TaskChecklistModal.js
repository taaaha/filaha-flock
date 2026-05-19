import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';

function pickLang(obj, lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.ar || obj.en || obj.fr || '';
}

/**
 * The daily task checklist. Used to live inside the (now removed) Guide
 * tab; it's surfaced here as a focused modal from the dashboard card so
 * the farmer's daily routine isn't lost.
 */
export default function TaskChecklistModal({
  visible, tasks, doneIds, language, t, onToggle, onClose,
}) {
  const styles = useStyles(makeStyles);
  const total = tasks?.length || 0;
  const done = tasks ? tasks.filter((x) => doneIds[x.id]).length : 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('tasksDoneToday') || 'Daily tasks'}</Text>
              <Text style={styles.sub}>
                {done}/{total}{total ? `  ·  ${pct}%` : ''}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              android_ripple={{ color: colors.textTertiary + '33', borderless: true, radius: 22 }}
              style={styles.closeBtn}
              accessibilityRole="button"
            >
              <Icon name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          >
            {(tasks || []).map((task) => {
              const checked = !!doneIds[task.id];
              return (
                <Pressable
                  key={task.id}
                  onPress={() => onToggle(task.id)}
                  android_ripple={{ color: colors.accent + '18' }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <View style={[styles.box, checked && styles.boxOn]}>
                    {checked ? <Icon name="checkCircle" size={16} color="#fff" strokeWidth={3} /> : null}
                  </View>
                  <View style={styles.taskTextCol}>
                    <Text
                      style={[styles.taskText, checked && styles.taskTextDone]}
                      numberOfLines={1}
                    >
                      {pickLang(task.title || task.label, language)}
                    </Text>
                    {task.detail ? (
                      <Text style={styles.taskDetail} numberOfLines={2}>
                        {pickLang(task.detail, language)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = () => ({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 42, height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.card,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.ok,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  box: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: colors.ok,
    borderColor: colors.ok,
  },
  taskTextCol: { flex: 1 },
  taskText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  taskTextDone: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  taskDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
});
