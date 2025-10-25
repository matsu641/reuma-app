import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';

const ContactScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!message.trim()) {
      Alert.alert('エラー', 'お問い合わせ内容を入力してください。');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // メール送信が可能かチェック
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert(
          'メールアプリが見つかりません',
          'デバイスにメールアプリが設定されていません。メールアプリを設定してから再度お試しください。'
        );
        setIsSubmitting(false);
        return;
      }

      // メール内容を構成
      const emailBody = `
お問い合わせ内容:
${message}

---
送信日時: ${new Date().toLocaleString('ja-JP')}
アプリ: リウマチ管理アプリ（匿名投稿）
      `.trim();

      // メール作成画面を開く
      await MailComposer.composeAsync({
        recipients: ['misumimatsudo@gmail.com'],
        subject: `[リウマチアプリ] 匿名お問い合わせ`,
        body: emailBody,
      });

      // フォームをリセット
      setMessage('');

      Alert.alert(
        '送信完了',
        'お問い合わせを送信しました。ご返信まで少々お待ちください。',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('メール送信エラー:', error);
      Alert.alert(
        'エラー',
        'メール送信中にエラーが発生しました。もう一度お試しください。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>お問い合わせ</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>匿名お問い合わせ</Text>
            <Text style={styles.infoDescription}>
              個人情報を入力せずに、匿名でご質問やご要望をお送りいただけます。
              アプリの改善にご協力をお願いします。
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>お問い合わせ内容</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="ご質問やご要望を匿名でお送りいただけます。お気軽にどうぞ..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>送信中...</Text>
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.textLight} />
                <Text style={styles.submitButtonText}>送信する</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: 50,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  backButton: {
    padding: spacing.xs,
  },

  headerRight: {
    width: 32,
  },

  content: {
    flex: 1,
    padding: spacing.md,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.lightBlue,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },

  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  infoDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  form: {
    backgroundColor: colors.background,
  },

  inputGroup: {
    marginBottom: spacing.lg,
  },

  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },

  messageInput: {
    height: 180,
    paddingTop: spacing.sm,
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },

  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },

  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
});

export default ContactScreen;