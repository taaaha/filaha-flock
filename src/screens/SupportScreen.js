import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, useTheme, barStyle } from '../utils/colors';
import Icon from '../components/Icon';
import CoopMascot from '../components/CoopMascot';
import { FAQ, SUPPORT_CONTACT, matchFaq } from '../utils/faqContent';

const T = {
  title:    { ar: 'الدعم والمساعدة', fr: 'Aide & Support', en: 'Help & Support' },
  greeting: {
    ar: 'مرحبًا! أنا مساعد فلاحة فلوك. اسألني عن أي مشكلة تقنية أو اختر سؤالًا بالأسفل:',
    fr: "Bonjour ! Je suis l'assistant Filaha Flock. Posez votre question ou choisissez ci-dessous :",
    en: "Hi! I'm the Filaha Flock assistant. Ask me anything, or pick a question below:",
  },
  fallback: {
    ar: 'لم أفهم سؤالك تمامًا. جرّب صياغة أخرى، أو اختر من الأسئلة الشائعة، أو تواصل معنا مباشرة بالأسفل.',
    fr: "Je n'ai pas bien compris. Reformulez, choisissez une question fréquente, ou contactez-nous directement en bas.",
    en: "I didn't quite get that. Try rephrasing, pick a common question, or contact us directly below.",
  },
  common:   { ar: 'أسئلة شائعة', fr: 'Questions fréquentes', en: 'Common questions' },
  contact:  { ar: 'تواصل معنا', fr: 'Contactez-nous', en: 'Contact us' },
  ph:       { ar: 'اكتب سؤالك…', fr: 'Écrivez votre question…', en: 'Type your question…' },
};

export default function SupportScreen({ navigation }) {
  useTheme();
  const { language } = useApp();
  const lang = ['ar', 'fr', 'en'].includes(language) ? language : 'ar';
  const styles = makeStyles();

  const [messages, setMessages] = useState([{ from: 'bot', text: T.greeting[lang] }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const ask = useCallback((text) => {
    const q = (text || '').trim();
    if (!q) return;
    const entry = matchFaq(q);
    const answer = entry ? (entry.a[lang] || entry.a.en) : T.fallback[lang];
    setMessages((m) => [...m, { from: 'user', text: q }, { from: 'bot', text: answer }]);
    setInput('');
    scrollDown();
  }, [lang]);

  const open = (url) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle={barStyle()} backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Pressable onPress={() => navigation?.goBack?.()} hitSlop={12} style={styles.back}>
          <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headTitle}>
          <View style={styles.headAvatar}><CoopMascot status="ok" size={28} /></View>
          <Text style={styles.title}>{T.title[lang]}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m, i) => (
          <View key={i} style={[styles.row, m.from === 'user' ? styles.rowUser : styles.rowBot]}>
            {m.from === 'bot' && (
              <View style={styles.botDot}><CoopMascot status="ok" size={20} /></View>
            )}
            <View style={[styles.bubble, m.from === 'user' ? styles.userBubble : styles.botBubble]}>
              <Text style={m.from === 'user' ? styles.userText : styles.botText}>{m.text}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.section}>{T.common[lang]}</Text>
        <View style={styles.chips}>
          {FAQ.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => ask(f.q[lang] || f.q.en)}
              android_ripple={{ color: colors.accent + '22' }}
              style={styles.chip}
            >
              <Text style={styles.chipText} numberOfLines={2}>{f.q[lang] || f.q.en}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{T.contact[lang]}</Text>
        <View style={styles.card}>
          <Pressable style={styles.crow} android_ripple={{ color: colors.accent + '18' }}
            onPress={() => open(`tel:${SUPPORT_CONTACT.phone}`)}>
            <View style={styles.cIcon}><Icon name="phone" size={18} color={colors.accent} /></View>
            <Text style={styles.cLabel}>{SUPPORT_CONTACT.phone}</Text>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>
          <View style={styles.sep} />
          <Pressable style={styles.crow} android_ripple={{ color: colors.accent + '18' }}
            onPress={() => open(`https://wa.me/${SUPPORT_CONTACT.whatsapp}`)}>
            <View style={styles.cIcon}><Icon name="messageSquare" size={18} color={colors.accent} /></View>
            <Text style={styles.cLabel}>WhatsApp</Text>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>
          <View style={styles.sep} />
          <Pressable style={styles.crow} android_ripple={{ color: colors.accent + '18' }}
            onPress={() => open(`mailto:${SUPPORT_CONTACT.email}`)}>
            <View style={styles.cIcon}><Icon name="mail" size={18} color={colors.accent} /></View>
            <Text style={styles.cLabel}>{SUPPORT_CONTACT.email}</Text>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={T.ph[lang]}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          onSubmitEditing={() => ask(input)}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable onPress={() => ask(input)} style={styles.send}
          android_ripple={{ color: '#ffffff33', borderless: true }}>
          <Icon name="send" size={20} color="#fffdf7" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    back: { padding: 2 },
    headTitle: { flexDirection: 'row', alignItems: 'center' },
    headAvatar: {
      width: 38, height: 38, borderRadius: 12, marginEnd: 10,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
    },
    title: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },

    row: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
    rowBot: { justifyContent: 'flex-start' },
    rowUser: { justifyContent: 'flex-end' },
    botDot: {
      width: 30, height: 30, borderRadius: 15, marginEnd: 8,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    },
    bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    botBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomStartRadius: 6 },
    userBubble: { backgroundColor: colors.accent, borderBottomEndRadius: 6 },
    botText: { color: colors.textPrimary, fontSize: 14.5, lineHeight: 21 },
    userText: { color: '#fffdf7', fontSize: 14.5, lineHeight: 21, fontWeight: '600' },

    section: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 18, marginBottom: 10, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight,
      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8, marginEnd: 8, maxWidth: '100%',
    },
    chipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },

    card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    crow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
    cIcon: {
      width: 34, height: 34, borderRadius: 10, marginEnd: 12,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent + '18',
    },
    cLabel: { flex: 1, color: colors.textPrimary, fontSize: 14.5, fontWeight: '600' },
    sep: { height: 1, backgroundColor: colors.border, marginStart: 60 },

    inputBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated,
    },
    input: {
      flex: 1, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight,
      paddingHorizontal: 16, paddingVertical: 10, color: colors.textPrimary, fontSize: 14.5, marginEnd: 8,
      textAlign: 'auto',
    },
    send: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
