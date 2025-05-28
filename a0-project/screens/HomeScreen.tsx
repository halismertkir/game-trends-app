import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import Markdown from 'react-native-markdown-display';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function HomeScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('https://ea29-176-30-251-15.ngrok-free.app/api/agents/weatherAgent/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: currentInput }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('=== API RESPONSE DEBUG ===');
      console.log('Raw response:', data);
      console.log('Response type:', typeof data);
      console.log('Response keys:', Object.keys(data || {}));
      console.log('Stringified:', JSON.stringify(data, null, 2));
      console.log('========================');
      
      let assistantContent = 'Özür dilerim, bir cevap oluşturamadım.';
      
      // API yanıtından içeriği çıkar - derinlemesine kontrol
      const extractContent = (obj: any): string => {
        if (!obj) return '';
        
        // Eğer string ise direkt döndür
        if (typeof obj === 'string') {
          return obj;
        }
        
        // Eğer array ise ilk elemanı kontrol et
        if (Array.isArray(obj)) {
          if (obj.length > 0) {
            return extractContent(obj[0]);
          }
          return '';
        }
        
        // Object ise muhtemel field'ları kontrol et
        if (typeof obj === 'object') {
          // Ana content field'ları
          const contentFields = [
            'content', 'message', 'response', 'text', 'completion', 
            'answer', 'result', 'output', 'data', 'body', 'reply'
          ];
          
          for (const field of contentFields) {
            if (obj[field]) {
              const extracted = extractContent(obj[field]);
              if (extracted && extracted.trim()) {
                return extracted;
              }
            }
          }
          
          // Nested object kontrolü
          if (obj.choices && Array.isArray(obj.choices) && obj.choices.length > 0) {
            return extractContent(obj.choices[0]);
          }
          
          if (obj.messages && Array.isArray(obj.messages) && obj.messages.length > 0) {
            return extractContent(obj.messages[obj.messages.length - 1]);
          }
          
          // Son çare - object'in ilk string değerini bul
          for (const key in obj) {
            if (obj.hasOwnProperty(key) && typeof obj[key] === 'string' && obj[key].trim()) {
              return obj[key];
            }
          }
        }
        
        return '';
      };
      
      const extractedContent = extractContent(data);
      if (extractedContent && extractedContent.trim()) {
        assistantContent = extractedContent.trim();
      }
      
      // Son kontrol - eğer hâlâ [object Object] gibi bir şey varsa
      if (assistantContent.includes('[object Object]') || assistantContent === '[object Object]') {
        assistantContent = 'API yanıtı işlenirken bir sorun oluştu. Lütfen tekrar deneyin.';
        console.error('Failed to extract content from API response:', data);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: String(assistantContent),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Mesaj eklendikten sonra en alta kaydır
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        url: 'https://ea29-176-30-251-15.ngrok-free.app/api/agents/weatherAgent/generate'
      });
      
      // Hata durumunda hata mesajını ekle
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Üzgünüm, bir hata oluştu: ${error.message || 'Bilinmeyen hata'}. Lütfen tekrar deneyin.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.role === 'user' ? styles.userMessage : styles.assistantMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble
      ]}>
        {item.role === 'assistant' ? (
          <Markdown style={markdownStyles}>
            {item.content}
          </Markdown>
        ) : (
          <Text style={[styles.messageText, styles.userText]}>
            {item.content}
          </Text>
        )}
        <Text style={[
          styles.timestamp,
          item.role === 'user' ? styles.userTimestamp : styles.assistantTimestamp
        ]}>
          {item.timestamp.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.botAvatar}>
            <Ionicons name="chatbubbles" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>AI Asistan</Text>
            <Text style={styles.headerSubtitle}>
              {isLoading ? 'yazıyor...' : 'Çevrimiçi'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chatContainer}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ddd" />
            <Text style={styles.emptyStateText}>
              Merhaba! Size nasıl yardımcı olabilirim?
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Herhangi bir sorunuz varsa çekinmeden sorun.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            onLayout={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }}
          />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!isLoading}
            returnKeyType="send"
            onSubmitEditing={() => {
              if (!isLoading && inputText.trim()) {
                sendMessage();
              }
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 20,
    color: '#212529',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  code_block: {
    backgroundColor: '#f1f3f4',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fence: {
    backgroundColor: '#f1f3f4',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  list_item: {
    marginVertical: 2,
  },
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
  heading1: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  heading2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  heading3: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#495057',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007bff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#212529',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 6,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: '#6c757d',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6c757d',
  },
});