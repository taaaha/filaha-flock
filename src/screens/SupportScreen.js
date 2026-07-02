import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, useTheme, barStyle } from '../utils/colors';
import Icon from '../components/Icon';
import CoopMascot from '../components/CoopMascot';
import { FAQ, SUPPORT_CONTACT, matchFaq, detectLang } from '../utils/faqContent';

const T = {
  title:    { ar: 'الدعم والمساعدة', fr: 'Aide & Support', en: 'Help & Support' },
  greeting: {
    ar: 'مرحبًا! أنا مساعد فلاحة فلوك 🐥 اسألني عن أي مشكلة، أو اختر سؤالًا من الأسفل.',
    fr: "Bonjour ! Je suis l'assistant Filaha Flock 🐥 Posez votre question, ou choisissez ci-dessous.",
    en: "Hi! I'm the Filaha Flock assistant 🐥 Ask me anything, or pick a question below.",
  },
  fallback: {
    ar: 'لم أفهم سؤالك تمامًا. جرّب صياغة أخرى، أو اختر سؤالًا شائعًا، أو تواصل معنا مباشرة بالأعلى.',
    fr: "Je n'ai pas bien compris. Reformulez, choisissez une question fréquente, ou contactez-nous en haut.",
    en: "I didn't quite get that. Try rephrasing, pick a common question, or contact us at the top.",
  },
  ph:       { ar: 'اكتب سؤالك…', fr: 'Écrivez votre question…', en: 'Type your question…' },
  call:     { ar: 'اتصال', fr: 'Appeler', en: 'Call' },
  email:    { ar: 'إيميل', fr: 'Email', en: 'Email' },
};

export default function SupportScreen({ navigation }) {
  useTheme();
  const { language } = useApp();
  const lang = ['ar', 'fr', 'en'].includes(language) ? language : 'ar';
  const styles = makeStyles();

  const [messages, setMessages] = useState([{ from: 'bot', text: T.greeting[lang] }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const toEnd = () => requestAnimationFrame(() =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30));

  const ask = useCallback((text) => {
    const q = (text || '').trim();
    if (!q) return;
    // Answer in the language the farmer TYPED, not just the app language.
    const qLang = detectLang(q, lang);
    const { entry, suggestions } = matchFaq(q);
    const reply = entry
      ? { from: 'bot', text: entry.a[qLang] || entry.a.en }
      : {
          from: 'bot',
          text: T.fallback[qLang] || T.fallback[lang],
          suggestions: suggestions.length ? suggestions : FAQ.slice(0, 3),
          sLang: qLang,
        };
    setMessages((m) => [...m, { from: 'user', text: q }, reply]);
    setInput('');
    toEnd();
  }, [lang]);

  const open = (url) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle={barStyle()} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation?.goBack?.()} hitSlop={12} style={styles.back}>
          <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headTitle}>
          <View style={styles.headAvatar}><CoopMascot status="ok" size={26} /></View>
          <Text style={styles.title}>{T.title[lang]}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Contact strip — always visible so a human is one tap away */}
      <View style={styles.contactStrip}>
        <Pressable style={styles.cPill} android_ripple={{ color: colors.accent + '22' }}
          onPress={() => open(`tel:${SUPPORT_CONTACT.phone}`)}>
          <Icon name="phone" size={15} color={colors.accent} />
          <Text style={styles.cPillTxt}>{T.call[lang]}</Text>
        </Pressable>
        <Pressable style={styles.cPill} android_ripple={{ color: colors.accent + '22' }}
          onPress={() => open(`https://wa.me/${SUPPORT_CONTACT.whatsapp}`)}>
          <Icon name="messageSquare" size={15} color={colors.accent} />
          <Text style={styles.cPillTxt}>WhatsApp</Text>
        </Pressable>
        <Pressable style={styles.cPill} android_ripple={{ color: colors.accent + '22' }}
          onPress={() => open(`mailto:${SUPPORT_CONTACT.email}`)}>
          <Icon name="mail" size={15} color={colors.accent} />
          <Text style={styles.cPillTxt}>{T.email[lang]}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat — its OWN scroll view, so new replies always scroll into view */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((m, i) => (
            <View key={i}>
              <View style={[styles.row, m.from === 'user' ? styles.rowUser : styles.rowBot]}>
                {m.from === 'bot' && (
                  <View style={styles.botDot}><CoopMascot status="ok" size={18} /></View>
                )}
                <View style={[styles.bubble, m.from === 'user' ? styles.userBubble : styles.botBubble]}>
                  <Text style={m.from === 'user' ? styles.userText : styles.botText}>{m.text}</Text>
                </View>
              </View>
              {m.suggestions ? (
                <View style={styles.suggestWrap}>
                  {m.suggestions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => ask(s.q[m.sLang || lang] || s.q.en)}
                      android_ripple={{ color: colors.accent + '22' }}
                      style={styles.suggestBtn}
                    >
                      <Text style={styles.suggestTxt} numberOfLines={2}>
                        {s.q[m.sLang || lang] || s.q.en}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>

        {/* Quick questions — horizontal, right above the input */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsWrap}
        >
          {FAQ.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => ask(f.q[lang] || f.q.en)}
              android_ripple={{ color: colors.accent + '22' }}
              style={styles.chip}
            >
              <Text style={styles.chipText} numberOfLines={1}>{f.q[lang] || f.q.en}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input */}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 12,
    },
    back: { padding: 2 },
    headTitle: { flexDirection: 'row', alignItems: 'center' },
    headAvatar: {
      width: 36, height: 36, borderRadius: 12, marginEnd: 10,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
    },
    title: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },

    contactStrip: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    cPill: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: colors.accent + '14', borderRadius: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: colors.accent + '33',
    },
    cPillTxt: { color: colors.accent, fontSize: 12.5, fontWeight: '700' },

    row: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    rowBot: { justifyContent: 'flex-start' },
    rowUser: { justifyContent: 'flex-end' },
    botDot: {
      width: 28, height: 28, borderRadius: 14, marginEnd: 8,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    },
    bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    botBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomStartRadius: 6 },
    userBubble: { backgroundColor: colors.accent, borderBottomEndRadius: 6 },
    botText: { color: colors.textPrimary, fontSize: 14.5, lineHeight: 22 },
    userText: { color: '#fffdf7', fontSize: 14.5, lineHeight: 22, fontWeight: '600' },

    suggestWrap: { marginStart: 36, marginBottom: 12, gap: 6 },
    suggestBtn: {
      backgroundColor: colors.accent + '12', borderWidth: 1, borderColor: colors.accent + '33',
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, alignSelf: 'flex-start', maxWidth: '85%',
    },
    suggestTxt: { color: colors.accent, fontSize: 13, fontWeight: '700' },

    chipsWrap: { maxHeight: 52, borderTopWidth: 1, borderTopColor: colors.border },
    chipsRow: { paddingHorizontal: 12, paddingVertical: 9, gap: 8, alignItems: 'center' },
    chip: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight,
      borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginEnd: 8, maxWidth: 240,
    },
    chipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },

    inputBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated,
    },
    input: {
      flex: 1, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight,
      paddingHorizontal: 16, paddingVertical: 10, color: colors.textPrimary, fontSize: 14.5, marginEnd: 8,
      textAlign: 'auto', maxHeight: 100,
    },
    send: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
