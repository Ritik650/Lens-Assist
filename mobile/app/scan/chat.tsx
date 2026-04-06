import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { askFollowup } from '@/services/scan';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "I've analyzed the scanned item. Ask me anything about it — interactions, safety, usage, or anything else!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: q };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res: any = await askFollowup(scanId!, q);
      setMessages((m) => [...m, { id: Date.now().toString() + '1', role: 'assistant', content: res.answer }]);
    } catch (e: any) {
      setMessages((m) => [...m, { id: Date.now().toString() + '2', role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiDot} />
          <Text style={styles.headerTitle}>Ask Claude AI</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            item.role === 'user' ? styles.userBubble : styles.aiBubble,
          ]}>
            {item.role === 'assistant' && (
              <View style={styles.aiAvatar}>
                <Ionicons name="flash" size={12} color={Colors.accent} />
              </View>
            )}
            <View style={[
              styles.bubbleContent,
              item.role === 'user' ? styles.userContent : styles.aiContent,
            ]}>
              <Text style={[
                styles.bubbleText,
                item.role === 'user' ? styles.userText : styles.aiText,
              ]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={styles.thinkingRow}>
            <View style={styles.aiAvatar}>
              <Ionicons name="flash" size={12} color={Colors.accent} />
            </View>
            <View style={styles.thinkingBubble}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={styles.thinkingText}>Claude is thinking...</Text>
            </View>
          </View>
        ) : null}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask anything about this scan..."
          placeholderTextColor={Colors.textLight}
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={loading || !input.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryBg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  msgList: { padding: 16, paddingBottom: 8, gap: 12 },

  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accentBorder,
    flexShrink: 0,
  },
  bubbleContent: { maxWidth: '80%', borderRadius: 16, padding: 14 },
  userContent: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: Colors.text },

  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  thinkingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  thinkingText: { color: Colors.textMuted, fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  input: {
    flex: 1, backgroundColor: Colors.surface2, color: Colors.text,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.accent, borderRadius: 20, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
