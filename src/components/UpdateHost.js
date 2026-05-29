import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import { useApp } from '../contexts/AppContext';
import { useUpdates } from '../contexts/UpdateContext';
import { pickNotes } from '../services/UpdateService';

/**
 * UpdateHost — global, screen-agnostic surface for the hybrid updater.
 * Mounted once near ToastHost. Renders:
 *   • a slim, dismissible top banner when an update is available, and
 *   • a detail modal (release notes, progress, smart action button).
 * Reads everything from UpdateContext; shows nothing when idle.
 */
export default function UpdateHost() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { t, language } = useApp();
  const {
    status, update, progress, surfaced, mandatory,
    applyUpdate, dismiss,
  } = useUpdates();

  const [open, setOpen] = useState(false);

  const isApk = update && update.type === 'apk';
  const isOta = update && update.type === 'ota';
  const newVersion = isApk ? (update.manifest.versionName || '') : '';
  const notes = isApk ? pickNotes(update.manifest, language) : '';
  const sizeMb = isApk && update.manifest.sizeBytes
    ? Math.max(1, Math.round(update.manifest.sizeBytes / 1048576))
    : 0;

  // Mandatory updates take over the screen; modal can't be dismissed.
  const visible = open || (mandatory && surfaced);
  const showBanner = surfaced && status === 'available' && !visible;

  // Banner entrance animation.
  const slide = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    Animated.spring(slide, {
      toValue: showBanner ? 0 : -120,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
  }, [showBanner, slide]);

  const close = () => { if (!mandatory) setOpen(false); };

  const busy = status === 'downloading' || status === 'installing';

  // Smart action button — label + behavior by current status.
  let actionLabel = isOta ? t('updateRestart') : t('updateNow');
  let actionLoading = false;
  if (status === 'downloading') { actionLabel = t('updateDownloading'); actionLoading = true; }
  else if (status === 'installing') { actionLabel = isOta ? t('updateRestarting') : t('updateInstalling'); actionLoading = true; }
  else if (status === 'needsPermission') { actionLabel = t('updateRetry'); }
  else if (status === 'error') { actionLabel = t('updateRetry'); }

  return (
    <>
      {/* ── Top banner ── */}
      {showBanner ? (
        <Animated.View
          style={[
            styles.bannerWrap,
            { top: insets.top + 8, transform: [{ translateY: slide }] },
          ]}
        >
          <Pressable
            style={styles.banner}
            onPress={() => setOpen(true)}
            android_ripple={{ color: colors.accent + '22' }}
            accessibilityRole="button"
          >
            <View style={styles.bannerIcon}>
              <Icon name="download" size={18} color={colors.accent} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {mandatory ? t('updateRequired') : t('updateAvailable')}
              </Text>
              <Text style={styles.bannerHint} numberOfLines={1}>
                {isApk && newVersion
                  ? t('updateNewVersion').replace('{version}', newVersion)
                  : t('updateTapToInstall')}
              </Text>
            </View>
            {!mandatory ? (
              <Pressable
                onPress={dismiss}
                hitSlop={10}
                style={styles.bannerClose}
                accessibilityRole="button"
              >
                <Icon name="x" size={16} color={colors.textTertiary} strokeWidth={2.4} />
              </Pressable>
            ) : null}
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ── Detail modal ── */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.card} onPress={() => {}}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, mandatory && styles.cardIconWarn]}>
                <Icon
                  name={mandatory ? 'alertTriangle' : 'download'}
                  size={26}
                  color={mandatory ? colors.warn : colors.accent}
                  strokeWidth={2.2}
                />
              </View>
              {!mandatory ? (
                <Pressable onPress={close} hitSlop={10} style={styles.cardClose}>
                  <Icon name="x" size={20} color={colors.textTertiary} strokeWidth={2.2} />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.title}>
              {mandatory ? t('updateRequired') : t('updateAvailable')}
            </Text>

            {isApk && newVersion ? (
              <Text style={styles.versionLine}>
                {t('updateNewVersion').replace('{version}', newVersion)}
                {sizeMb ? `  ·  ${sizeMb} ${t('updateMb')}` : ''}
              </Text>
            ) : null}

            {/* Body copy / release notes */}
            {status === 'needsPermission' ? (
              <Text style={styles.body}>{t('updatePermissionNeeded')}</Text>
            ) : status === 'error' ? (
              <Text style={[styles.body, { color: colors.danger }]}>
                {t('updateFailed')}
              </Text>
            ) : isOta ? (
              <Text style={styles.body}>{t('updateOtaDesc')}</Text>
            ) : notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>{t('updateWhatsNew')}</Text>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            ) : (
              <Text style={styles.body}>{t('updateGenericDesc')}</Text>
            )}

            {mandatory && status === 'available' ? (
              <Text style={styles.mandatoryNote}>{t('updateMandatoryNote')}</Text>
            ) : null}

            {/* Progress bar (APK download) */}
            {status === 'downloading' ? (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round((progress || 0) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round((progress || 0) * 100)}%
                </Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <PrimaryButton
                title={actionLabel}
                onPress={applyUpdate}
                loading={actionLoading}
                disabled={busy}
                icon={!actionLoading ? '↓' : undefined}
                variant={mandatory ? 'warn' : 'primary'}
              />
              {!mandatory && !busy ? (
                <Pressable onPress={close} style={styles.laterBtn} hitSlop={6}>
                  <Text style={styles.laterText}>{t('updateLater')}</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = () => ({
  // Banner
  bannerWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9998,
    elevation: 14,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.accent + '55',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...shadows.lg,
  },
  bannerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent + '1f',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  bannerHint: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 1 },
  bannerClose: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    ...shadows.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.accent + '1f',
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconWarn: { backgroundColor: colors.warn + '1f' },
  cardClose: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20, fontWeight: '900',
    marginTop: 14,
  },
  versionLine: {
    color: colors.accent,
    fontSize: 13, fontWeight: '800',
    marginTop: 4,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14, fontWeight: '600',
    lineHeight: 21,
    marginTop: 12,
  },
  notesBox: {
    marginTop: 14,
    backgroundColor: colors.cardElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  notesLabel: {
    color: colors.textTertiary,
    fontSize: 11, fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  notesText: {
    color: colors.textPrimary,
    fontSize: 14, fontWeight: '600',
    lineHeight: 21,
  },
  mandatoryNote: {
    color: colors.warn,
    fontSize: 12, fontWeight: '700',
    marginTop: 12,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12, fontWeight: '800',
    minWidth: 38,
    textAlign: 'right',
  },
  actions: { marginTop: 22, gap: 6 },
  laterBtn: { alignItems: 'center', paddingVertical: 12 },
  laterText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
});
