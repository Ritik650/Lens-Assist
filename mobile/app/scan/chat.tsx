import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
      style={{ flex: 1, backgroundColor: Colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: item.role === 'user' ? Colors.accent : Colors.surface,
            borderRadius: 16,
            borderBottomRightRadius: item.role === 'user' ? 4 : 16,
            borderBottomLeftRadius: item.role === 'assistant' ? 4 : 16,
            padding: 14,
            marginBottom: 10,
            maxWidth: '85%',
            borderWidth: item.role === 'assistant' ? 1 : 0,
            borderColor: Colors.border,
          }}>
            <Text style={{ color: item.role === 'user' ? Colors.primary : Colors.text, fontSize: 15, lineHeight: 22 }}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
            <ActivityIndicator color={Colors.accent} size="small" />
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Claude is thinking...</Text>
          </View>
        ) : null}
      />

      <View style={{ flexDirection: 'row', padding: 16, gap: 10, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: Colors.border }}>
        <TextInput
          style={{ flex: 1, backgroundColor: Colors.surface, color: Colors.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: Colors.border }}
          placeholder="Ask anything about this scan..."
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={{ backgroundColor: Colors.accent, borderRadius: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', opacity: loading || !input.trim() ? 0.5 : 1 }}
          onPress={send}
          disabled={loading || !input.trim()}
        >
          <Text style={{ fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
