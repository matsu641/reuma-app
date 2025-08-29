import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';

const WeatherSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    pressureAlerts: true,
    alertThreshold: 3,
    autoUpdate: true,
    updateInterval: 30,
    locationEnabled: true,
    pushNotifications: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('weatherSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Settings load error:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      setIsLoading(true);
      await AsyncStorage.setItem('weatherSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('設定保存', '設定を保存しました。');
    } catch (error) {
      console.error('Settings save error:', error);
      Alert.alert('エラー', '設定の保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleThresholdChange = (value) => {
    const threshold = parseInt(value) || 3;
    if (threshold >= 1 && threshold <= 10) {
      const newSettings = { ...settings, alertThreshold: threshold };
      saveSettings(newSettings);
    }
  };

  const handleIntervalChange = (value) => {
    const interval = parseInt(value) || 30;
    if (interval >= 15 && interval <= 120) {
      const newSettings = { ...settings, updateInterval: interval };
      saveSettings(newSettings);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      '設定をリセット',
      'すべての設定を初期値に戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              pressureAlerts: true,
              alertThreshold: 3,
              autoUpdate: true,
              updateInterval: 30,
              locationEnabled: true,
              pushNotifications: true,
            };
            saveSettings(defaultSettings);
          }
        }
      ]
    );
  };

  const SettingRow = ({ 
    title, 
    description, 
    icon, 
    type = 'switch', 
    value, 
    onValueChange,
    unit = '',
    min,
    max 
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <View style={styles.settingControl}>
        {type === 'switch' && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
          />
        )}
        {type === 'input' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.settingInput}
              value={value.toString()}
              onChangeText={onValueChange}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.inputUnit}>{unit}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>天気設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* アラート設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アラート設定</Text>
          
          <SettingRow
            title="気圧変化アラート"
            description="気圧が急激に変化した時に通知します"
            icon="notifications-outline"
            type="switch"
            value={settings.pressureAlerts}
            onValueChange={() => handleToggle('pressureAlerts')}
          />
          
          {settings.pressureAlerts && (
            <SettingRow
              title="アラート閾値"
              description="この値以上気圧が下がった時にアラートを送信"
              icon="speedometer-outline"
              type="input"
              value={settings.alertThreshold}
              onValueChange={handleThresholdChange}
              unit="hPa"
              min={1}
              max={10}
            />
          )}
          
          <SettingRow
            title="プッシュ通知"
            description="気圧アラートをプッシュ通知で受け取る"
            icon="phone-portrait-outline"
            type="switch"
            value={settings.pushNotifications}
            onValueChange={() => handleToggle('pushNotifications')}
          />
        </View>

        {/* 更新設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>更新設定</Text>
          
          <SettingRow
            title="自動更新"
            description="定期的に天気情報を自動更新します"
            icon="refresh-outline"
            type="switch"
            value={settings.autoUpdate}
            onValueChange={() => handleToggle('autoUpdate')}
          />
          
          {settings.autoUpdate && (
            <SettingRow
              title="更新間隔"
              description="天気情報を更新する間隔"
              icon="time-outline"
              type="input"
              value={settings.updateInterval}
              onValueChange={handleIntervalChange}
              unit="分"
              min={15}
              max={120}
            />
          )}
        </View>

        {/* 位置情報設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>位置情報設定</Text>
          
          <SettingRow
            title="位置情報を使用"
            description="現在地の天気情報を取得します"
            icon="location-outline"
            type="switch"
            value={settings.locationEnabled}
            onValueChange={() => handleToggle('locationEnabled')}
          />
        </View>

        {/* 説明セクション */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoTitle}>設定について</Text>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemTitle}>気圧変化アラート</Text>
              <Text style={styles.infoItemText}>
                過去3時間の平均気圧と比較して、設定した閾値以上下がった場合にアラートを送信します。
                一般的に3hPa以上の急降下で症状が出やすいとされています。
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemTitle}>更新間隔</Text>
              <Text style={styles.infoItemText}>
                頻繁な更新はバッテリー消費が増加します。
                症状管理には30分間隔での更新が推奨されます。
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemTitle}>位置情報</Text>
              <Text style={styles.infoItemText}>
                正確な天気データのために位置情報の使用を推奨します。
                データはデバイス内にのみ保存され、外部に送信されません。
              </Text>
            </View>
          </View>
        </View>

        {/* リセットボタン */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetToDefaults}
          disabled={isLoading}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textLight} />
          <Text style={styles.resetButtonText}>設定をリセット</Text>
        </TouchableOpacity>
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
    paddingTop: 50,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  backButton: {
    padding: spacing.xs,
  },
  
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  content: {
    flex: 1,
    backgroundColor: colors.lightBackground,
  },
  
  section: {
    backgroundColor: colors.background,
    marginTop: spacing.md,
  },
  
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lightGray,
  },
  
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  
  settingIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  
  settingContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  
  settingTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  
  settingDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  
  settingControl: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  settingInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.md,
    textAlign: 'center',
    minWidth: 50,
    backgroundColor: colors.background,
  },
  
  inputUnit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  
  infoSection: {
    backgroundColor: colors.background,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lightGray,
  },
  
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  
  infoContent: {
    padding: spacing.md,
  },
  
  infoItem: {
    marginBottom: spacing.md,
  },
  
  infoItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  infoItemText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  
  resetButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
});

export default WeatherSettingsScreen;
