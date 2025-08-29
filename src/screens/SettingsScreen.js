import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import NotificationService from '../services/NotificationService';

const SettingItem = ({ title, subtitle, icon, onPress, rightComponent }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <View style={styles.settingItemLeft}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <View style={styles.settingItemText}>
        <Text style={styles.settingItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {rightComponent || <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [symptomReminder, setSymptomReminder] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setNotificationsEnabled(parsedSettings.notificationsEnabled ?? true);
        setSymptomReminder(parsedSettings.symptomReminder ?? true);
        setMedicationReminders(parsedSettings.medicationReminders ?? true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleNotificationsToggle = async (value) => {
    setNotificationsEnabled(value);
    
    if (!value) {
      // 全ての通知をオフにする
      await NotificationService.cancelAllNotifications();
      setSymptomReminder(false);
      setMedicationReminders(false);
    }
    
    await saveSettings({
      notificationsEnabled: value,
      symptomReminder: value ? symptomReminder : false,
      medicationReminders: value ? medicationReminders : false,
    });
  };

  const handleSymptomReminderToggle = async (value) => {
    if (!notificationsEnabled) return;
    
    setSymptomReminder(value);
    
    if (value) {
      await NotificationService.scheduleSymptomReminder();
    }
    
    await saveSettings({
      notificationsEnabled,
      symptomReminder: value,
      medicationReminders,
    });
  };

  const handleMedicationRemindersToggle = async (value) => {
    if (!notificationsEnabled) return;
    
    setMedicationReminders(value);
    
    if (!value) {
      // 全ての服薬通知をキャンセル
      await NotificationService.cancelAllNotifications();
    }
    
    await saveSettings({
      notificationsEnabled,
      symptomReminder,
      medicationReminders: value,
    });
  };

  const handleDataExport = () => {
    Alert.alert(
      'データエクスポート',
      'データのエクスポート機能は今後追加予定です。',
      [{ text: 'OK' }]
    );
  };

  const handleDataImport = () => {
    Alert.alert(
      'データインポート',
      'データのインポート機能は今後追加予定です。',
      [{ text: 'OK' }]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'データリセット',
      'すべてのデータが削除されます。この操作は元に戻せません。本当に実行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '確認',
              'データリセット機能は今後追加予定です。',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'プライバシーポリシー',
      '本アプリは個人の健康情報を安全に管理します。データは端末内に保存され、ユーザーの同意なしに第三者と共有されることはありません。',
      [{ text: '了解' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'アプリについて',
      'リウマチケア v1.0.0\n\nリウマチ患者の症状記録と服薬管理をサポートするアプリです。',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 通知設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知設定</Text>
          
          <SettingItem
            title="通知"
            subtitle="すべての通知のオン/オフ"
            icon="notifications-outline"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={notificationsEnabled ? colors.background : colors.gray}
              />
            }
          />
          
          <SettingItem
            title="症状記録リマインダー"
            subtitle="毎日の症状記録を促す通知"
            icon="body-outline"
            rightComponent={
              <Switch
                value={symptomReminder && notificationsEnabled}
                onValueChange={handleSymptomReminderToggle}
                disabled={!notificationsEnabled}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={symptomReminder && notificationsEnabled ? colors.background : colors.gray}
              />
            }
          />
          
          <SettingItem
            title="服薬リマインダー"
            subtitle="服薬時間をお知らせ"
            icon="medical-outline"
            rightComponent={
              <Switch
                value={medicationReminders && notificationsEnabled}
                onValueChange={handleMedicationRemindersToggle}
                disabled={!notificationsEnabled}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={medicationReminders && notificationsEnabled ? colors.background : colors.gray}
              />
            }
          />
        </View>

        {/* 薬剤管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>薬剤管理</Text>
          
          <SettingItem
            title="薬剤を追加"
            subtitle="新しい薬剤を登録"
            icon="add-circle-outline"
            onPress={() => navigation.navigate('AddMedication')}
          />
          
          <SettingItem
            title="薬剤一覧"
            subtitle="登録済みの薬剤を管理"
            icon="list-outline"
            onPress={() => Alert.alert('準備中', '薬剤一覧機能は今後追加予定です。')}
          />

          <SettingItem
            title="食事履歴"
            subtitle="薬物相互作用の記録を確認"
            icon="restaurant-outline"
            onPress={() => navigation.navigate('FoodHistory')}
          />
        </View>

        {/* データ管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ管理</Text>
          
          <SettingItem
            title="データエクスポート"
            subtitle="データをバックアップ"
            icon="download-outline"
            onPress={handleDataExport}
          />
          
          <SettingItem
            title="データインポート"
            subtitle="バックアップからデータを復元"
            icon="cloud-upload-outline"
            onPress={handleDataImport}
          />
          
          <SettingItem
            title="データリセット"
            subtitle="すべてのデータを削除"
            icon="trash-outline"
            onPress={handleResetData}
          />
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          
          <SettingItem
            title="プライバシーポリシー"
            subtitle="個人情報の取り扱いについて"
            icon="shield-checkmark-outline"
            onPress={handlePrivacyPolicy}
          />
          
          <SettingItem
            title="使い方"
            subtitle="アプリの使用方法"
            icon="help-circle-outline"
            onPress={() => Alert.alert('準備中', '使い方ガイドは今後追加予定です。')}
          />
          
          <SettingItem
            title="アプリについて"
            subtitle="バージョン情報"
            icon="information-circle-outline"
            onPress={handleAbout}
          />
        </View>

        {/* フィードバック */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>フィードバック</Text>
          
          <SettingItem
            title="お問い合わせ"
            subtitle="質問や要望をお送りください"
            icon="mail-outline"
            onPress={() => Alert.alert('準備中', 'お問い合わせ機能は今後追加予定です。')}
          />
          
          <SettingItem
            title="アプリを評価"
            subtitle="App Storeで評価"
            icon="star-outline"
            onPress={() => Alert.alert('準備中', 'アプリ評価機能は今後追加予定です。')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  
  content: {
    flex: 1,
  },
  
  section: {
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lightGray,
  },
  
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  settingItemText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  
  settingItemTitle: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  
  settingItemSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default SettingsScreen;
