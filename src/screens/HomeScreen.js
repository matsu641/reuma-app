import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatDateJapanese, formatDate } from '../utils/dateUtils';
import DatabaseService from '../services/DatabaseService';
import WeatherService from '../services/WeatherService';
import SymptomRecorder from '../components/SymptomRecorder';
import WeatherWidget from '../components/WeatherWidget';

const QuickActionCard = ({ title, subtitle, icon, color, onPress }) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={24} color={colors.textLight} />
    </View>
    <View style={styles.quickActionText}>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

const TodayStatusCard = ({ painScore, pressure, pressureChange }) => {
  const getPainLevelText = (score) => {
    if (score === null || score === undefined) return '未記録';
    if (score <= 3) return `軽度 (${score})`;
    if (score <= 6) return `中程度 (${score})`;
    return `重度 (${score})`;
  };

  const getPainColor = (score) => {
    if (score === null || score === undefined) return colors.gray;
    if (score <= 3) return colors.success;
    if (score <= 6) return colors.warning;
    return colors.danger;
  };

  const getPressureStatus = (pressure, change) => {
    if (!pressure) return { text: '取得中...', color: colors.gray };
    
    // 気圧レベルの判定（hPa基準）
    let pressureLevel = '';
    let pressureColor = colors.success;
    
    if (pressure < 1005) {
      pressureLevel = '極度に低い';
      pressureColor = colors.danger;
    } else if (pressure < 1013) {
      pressureLevel = '低い';
      pressureColor = colors.warning;
    } else if (pressure > 1023) {
      pressureLevel = '高い';
      pressureColor = colors.info;
    } else {
      pressureLevel = '普通';
      pressureColor = colors.success;
    }
    
    // 気圧変化の表示（24時間以内の変化）
    let changeText = '';
    if (change !== null && change !== undefined) {
      if (change < -3) {
        changeText = ' ↓急降下';
        pressureColor = colors.danger; // 急降下時は危険色に
      } else if (change < -1) {
        changeText = ' ↓下降';
      } else if (change > 3) {
        changeText = ' ↑急上昇';
      } else if (change > 1) {
        changeText = ' ↑上昇';
      }
    }
    
    return { 
      text: `${pressureLevel}${changeText}`, 
      color: pressureColor 
    };
  };

  const pressureStatus = getPressureStatus(pressure, pressureChange);

  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusCardTitle}>今日の状況</Text>
      
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="body" size={20} color={getPainColor(painScore)} />
          </View>
          <Text style={styles.statusLabel}>痛みレベル</Text>
          <Text style={[styles.statusValue, { color: getPainColor(painScore) }]}>
            {getPainLevelText(painScore)}
          </Text>
        </View>
        
        <View style={styles.statusDivider} />
        
        <View style={styles.statusItem}>
          <View style={styles.statusIconContainer}>
            <Ionicons 
              name="speedometer" 
              size={20} 
              color={pressureStatus.color}
            />
          </View>
          <Text style={styles.statusLabel}>気圧</Text>
          <Text style={[
            styles.statusValue,
            { color: pressureStatus.color }
          ]}>
            {pressureStatus.text}
          </Text>
        </View>
      </View>
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const [todayData, setTodayData] = useState({
    painScore: null,
    pressure: null,
    pressureChange: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSymptomRecorder, setShowSymptomRecorder] = useState(false);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      const today = formatDate(new Date());
      
      // 今日の症状記録を取得
      const symptoms = await DatabaseService.getSymptomLogs(today, today);
      const todaySymptom = symptoms.length > 0 ? symptoms[0] : null;
      
      // 気圧情報を取得
      let pressure = null;
      let pressureChange = null;
      
      try {
        const weatherData = await WeatherService.getCurrentWeather();
        pressure = weatherData.pressure;
        
        // 気圧の変化を計算（過去24時間との比較）
        const pressureHistory = await WeatherService.getPressureHistory();
        if (pressureHistory && pressureHistory.length > 1) {
          const previousPressure = pressureHistory[pressureHistory.length - 2]?.pressure;
          if (previousPressure) {
            pressureChange = pressure - previousPressure;
          }
        }
        
        // 気圧履歴に保存
        await WeatherService.savePressureHistory(pressure);
      } catch (weatherError) {
        console.error('Weather data error:', weatherError);
        // エラー時もデフォルト値を設定
      }
      
      setTodayData({
        painScore: todaySymptom?.pain_score || null,
        pressure,
        pressureChange,
      });
    } catch (error) {
      console.error('Error loading today data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTodayData();
    setIsRefreshing(false);
  };

  const handleSymptomRecorded = () => {
    setShowSymptomRecorder(false);
    loadTodayData();
  };

  if (showSymptomRecorder) {
    return (
      <View style={commonStyles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowSymptomRecorder(false)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>症状記録</Text>
        </View>
        <SymptomRecorder onRecorded={handleSymptomRecorded} />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>リウマチケア</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.dateText}>
            {formatDateJapanese(new Date())}
          </Text>
          <Text style={styles.welcomeText}>お疲れさまです</Text>
        </View>
        
        <TodayStatusCard
          painScore={todayData.painScore}
          pressure={todayData.pressure}
          pressureChange={todayData.pressureChange}
        />
        
        <View style={styles.quickActionsContainer}>
          <Text style={commonStyles.subtitle}>クイックアクション</Text>
          
          {/* <QuickActionCard
            title="症状を記録"
            subtitle="痛みとこわばりを記録"
            icon="body-outline"
            color={colors.primary}
            onPress={() => setShowSymptomRecorder(true)}
          /> */}

          <QuickActionCard
            title="詳細症状記録"
            subtitle="関節マップで詳細記録"
            icon="body-outline"
            color="#9C27B0"
            onPress={() => navigation.navigate('DetailedSymptom')}
          />
          
          <QuickActionCard
            title="服薬管理"
            subtitle="今日の服薬状況を確認"
            icon="medical-outline"
            color={colors.secondary}
            onPress={() => navigation.navigate('Medication')}
          />
          
          <QuickActionCard
            title="食事管理"
            subtitle="薬物相互作用をチェック"
            icon="restaurant-outline"
            color="#FF6B35"
            onPress={() => navigation.navigate('FoodLog')}
          />
          
          <QuickActionCard
            title="検査値入力"
            subtitle="CRP・ESR・MMP-3"
            icon="analytics-outline"
            color={colors.accent}
            onPress={() => navigation.navigate('LabValues')}
          />
          
          <QuickActionCard
            title="グラフ表示"
            subtitle="症状の推移を確認"
            icon="bar-chart-outline"
            color={colors.success}
            onPress={() => navigation.navigate('Charts')}
          />
          
          <QuickActionCard
            title="診察レポート"
            subtitle="データを共有・印刷"
            icon="document-text-outline"
            color={colors.warning}
            onPress={() => navigation.navigate('Reports')}
          />
          
          <QuickActionCard
            title="生活パターン分析"
            subtitle="症状との相関を分析"
            icon="analytics"
            color="#E91E63"
            onPress={() => navigation.navigate('LifePatternAnalysis')}
          />
        </View>

        {/* 天気と気圧情報 */}
        <WeatherWidget navigation={navigation} />
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
    paddingTop: 50, // ステータスバー + 追加の余白
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
  
  settingsButton: {
    padding: spacing.xs,
  },
  
  content: {
    flex: 1,
  },
  
  welcomeContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  
  dateText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    opacity: 0.9,
  },
  
  welcomeText: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  
  statusCard: {
    ...commonStyles.card,
    marginBottom: spacing.lg,
  },
  
  statusCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  statusValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  
  statusDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  
  quickActionsContainer: {
    paddingHorizontal: spacing.md,
  },
  
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  quickActionText: {
    flex: 1,
  },
  
  quickActionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  quickActionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default HomeScreen;
