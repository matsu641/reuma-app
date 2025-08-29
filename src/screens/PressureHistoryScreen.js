import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import WeatherService from '../services/WeatherService';

const { width: screenWidth } = Dimensions.get('window');

const PressureHistoryScreen = ({ navigation }) => {
  const [pressureData, setPressureData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [stats, setStats] = useState({
    average: 0,
    min: 0,
    max: 0,
    variance: 0,
  });

  const periodOptions = [
    { key: '3days', label: '3日', days: 3 },
    { key: '7days', label: '1週間', days: 7 },
    { key: '14days', label: '2週間', days: 14 },
    { key: '30days', label: '1ヶ月', days: 30 },
  ];

  useEffect(() => {
    loadPressureHistory();
  }, [selectedPeriod]);

  const loadPressureHistory = async () => {
    try {
      setIsLoading(true);
      const period = periodOptions.find(p => p.key === selectedPeriod);
      const history = await WeatherService.getPressureHistory(period.days);
      
      if (history.length > 0) {
        setPressureData(history);
        calculateStats(history);
      } else {
        setPressureData([]);
        setStats({ average: 0, min: 0, max: 0, variance: 0 });
      }
    } catch (error) {
      console.error('Error loading pressure history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (data.length === 0) return;
    
    const pressures = data.map(d => d.pressure);
    const average = pressures.reduce((sum, p) => sum + p, 0) / pressures.length;
    const min = Math.min(...pressures);
    const max = Math.max(...pressures);
    
    // 気圧の変動幅を計算
    const variance = max - min;
    
    setStats({
      average: Math.round(average * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      variance: Math.round(variance * 10) / 10,
    });
  };

  const getChartData = () => {
    if (pressureData.length === 0) {
      return {
        labels: ['データなし'],
        datasets: [{ data: [1013] }]
      };
    }

    const maxPoints = 10;
    const step = Math.ceil(pressureData.length / maxPoints);
    const sampledData = pressureData.filter((_, index) => index % step === 0);
    
    return {
      labels: sampledData.map(d => {
        const date = new Date(d.timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        data: sampledData.map(d => d.pressure),
        color: (opacity = 1) => `rgba(66, 165, 245, ${opacity})`,
        strokeWidth: 2,
      }]
    };
  };

  const getPressureTrend = () => {
    if (pressureData.length < 2) return null;
    
    const recent = pressureData.slice(-3);
    const older = pressureData.slice(-6, -3);
    
    if (older.length === 0) return null;
    
    const recentAvg = recent.reduce((sum, d) => sum + d.pressure, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.pressure, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (Math.abs(diff) < 1) {
      return { trend: 'stable', icon: 'remove-outline', color: colors.primary, text: '安定' };
    } else if (diff > 0) {
      return { trend: 'rising', icon: 'trending-up-outline', color: colors.success, text: '上昇傾向' };
    } else {
      return { trend: 'falling', icon: 'trending-down-outline', color: colors.warning, text: '下降傾向' };
    }
  };

  const renderPeriodButton = (option) => (
    <TouchableOpacity
      key={option.key}
      style={[
        styles.periodButton,
        selectedPeriod === option.key && styles.periodButtonActive
      ]}
      onPress={() => setSelectedPeriod(option.key)}
    >
      <Text style={[
        styles.periodButtonText,
        selectedPeriod === option.key && styles.periodButtonTextActive
      ]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  const trend = getPressureTrend();

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>気圧データを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>気圧履歴</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 期間選択 */}
        <View style={styles.periodSelector}>
          {periodOptions.map(renderPeriodButton)}
        </View>

        {/* 統計情報 */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.average}</Text>
              <Text style={styles.statLabel}>平均</Text>
              <Text style={styles.statUnit}>hPa</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.min}</Text>
              <Text style={styles.statLabel}>最低</Text>
              <Text style={styles.statUnit}>hPa</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.max}</Text>
              <Text style={styles.statLabel}>最高</Text>
              <Text style={styles.statUnit}>hPa</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.variance}</Text>
              <Text style={styles.statLabel}>変動幅</Text>
              <Text style={styles.statUnit}>hPa</Text>
            </View>
          </View>
        </View>

        {/* トレンド情報 */}
        {trend && (
          <View style={styles.trendContainer}>
            <View style={styles.trendHeader}>
              <Ionicons name={trend.icon} size={20} color={trend.color} />
              <Text style={[styles.trendText, { color: trend.color }]}>
                {trend.text}
              </Text>
            </View>
          </View>
        )}

        {/* グラフ */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>気圧の推移</Text>
          {pressureData.length > 0 ? (
            <LineChart
              data={getChartData()}
              width={screenWidth - spacing.md * 2}
              height={220}
              yAxisSuffix="hPa"
              chartConfig={{
                backgroundColor: colors.background,
                backgroundGradientFrom: colors.background,
                backgroundGradientTo: colors.background,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(66, 165, 245, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: colors.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noDataText}>データがありません</Text>
              <Text style={styles.noDataSubtext}>
                天気情報の取得を開始すると、気圧の履歴が表示されます
              </Text>
            </View>
          )}
        </View>

        {/* 気圧と症状の関係についての説明 */}
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoTitle}>気圧と症状の関係</Text>
          </View>
          <Text style={styles.infoText}>
            一般的に、気圧が急激に低下する（3hPa以上）と、関節痛や体調不良を感じやすくなると言われています。
            この履歴を参考に、症状の変化と気圧の関係を観察してみてください。
          </Text>
          <View style={styles.infoTips}>
            <Text style={styles.infoTipsTitle}>💡 対策のヒント</Text>
            <Text style={styles.infoTipsText}>
              • 気圧低下時は無理をせず、十分な休息を
              {'\n'}• 室内の湿度を適切に保つ（50-60%）
              {'\n'}• 症状が強い時は早めに医師に相談
            </Text>
          </View>
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
    padding: spacing.md,
  },
  
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 2,
    marginBottom: spacing.lg,
  },
  
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  
  periodButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  periodButtonTextActive: {
    color: colors.textLight,
    fontWeight: 'bold',
  },
  
  statsContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  statUnit: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  
  trendContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  trendText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  
  chartContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  chartTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  
  chart: {
    marginVertical: spacing.sm,
    borderRadius: 16,
  },
  
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  
  noDataText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  
  noDataSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  
  infoContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: spacing.md,
  },
  
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  
  infoTips: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
  },
  
  infoTipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  infoTipsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

export default PressureHistoryScreen;
