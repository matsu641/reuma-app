import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { getDateRange, formatDate, formatDateJapanese } from '../utils/dateUtils';
import DatabaseService from '../services/DatabaseService';

const { width } = Dimensions.get('window');
const chartWidth = width - (spacing.md * 2);

const SymptomChart = ({ period = 7 }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const range = getDateRange(period);
      const logs = await DatabaseService.getSymptomLogs(range.start, range.end);
      
      const processedData = processSymptomData(logs, period);
      setData(processedData);
    } catch (error) {
      console.error('Error loading symptom data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processSymptomData = (logs, days) => {
    const dates = [];
    const painScores = [];
    const stiffnessDurations = [];
    
    // 過去n日分の日付を生成
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      dates.push(dateStr);
      
      // その日のデータを検索
      const dayLog = logs.find(log => log.date === dateStr);
      if (dayLog) {
        painScores.push(dayLog.pain_score);
        stiffnessDurations.push(dayLog.morning_stiffness_duration / 60); // 時間に変換
      } else {
        painScores.push(0);
        stiffnessDurations.push(0);
      }
    }

    return {
      labels: dates.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          data: painScores,
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
          strokeWidth: 3
        }
      ],
      painScores,
      stiffnessDurations,
      dates
    };
  };

  if (isLoading) {
    return (
      <View style={[styles.chartContainer, commonStyles.centerContent]}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (!data || data.painScores.every(score => score === 0)) {
    return (
      <View style={styles.chartContainer}>
        <Text style={commonStyles.subtitle}>痛みの推移</Text>
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.gray} />
          <Text style={styles.emptyText}>データがありません</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={commonStyles.subtitle}>痛みの推移</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={data}
          width={Math.max(chartWidth, data.labels.length * 50)}
          height={220}
          chartConfig={{
            backgroundColor: colors.background,
            backgroundGradientFrom: colors.background,
            backgroundGradientTo: colors.background,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: colors.primary
            }
          }}
          bezier
          style={styles.chart}
        />
      </ScrollView>
      
      {/* こわばりの時間チャート */}
      <Text style={[commonStyles.subtitle, { marginTop: spacing.lg }]}>
        朝のこわばり時間（時間）
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{
            labels: data.labels,
            datasets: [{
              data: data.stiffnessDurations
            }]
          }}
          width={Math.max(chartWidth, data.labels.length * 50)}
          height={220}
          chartConfig={{
            backgroundColor: colors.background,
            backgroundGradientFrom: colors.background,
            backgroundGradientTo: colors.background,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(126, 211, 33, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          style={styles.chart}
        />
      </ScrollView>
    </View>
  );
};

const MedicationAdherenceChart = ({ period = 7 }) => {
  const [adherenceData, setAdherenceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdherenceData();
  }, [period]);

  const loadAdherenceData = async () => {
    setIsLoading(true);
    try {
      const range = getDateRange(period);
      const adherence = await DatabaseService.getMedicationAdherence(range.start, range.end);
      setAdherenceData(adherence);
    } catch (error) {
      console.error('Error loading adherence data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.chartContainer, commonStyles.centerContent]}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  const adherencePercentage = adherenceData?.adherence || 0;
  const getAdherenceColor = (percentage) => {
    if (percentage >= 85) return colors.success;
    if (percentage >= 70) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={commonStyles.subtitle}>服薬遵守率</Text>
      
      <View style={styles.adherenceContainer}>
        <View style={styles.adherenceCircle}>
          <Text style={[
            styles.adherencePercentage,
            { color: getAdherenceColor(adherencePercentage) }
          ]}>
            {Math.round(adherencePercentage)}%
          </Text>
          <Text style={styles.adherenceLabel}>遵守率</Text>
        </View>
        
        <View style={styles.adherenceStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{adherenceData?.taken || 0}</Text>
            <Text style={styles.statLabel}>服用済み</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{adherenceData?.total || 0}</Text>
            <Text style={styles.statLabel}>予定回数</Text>
          </View>
        </View>
      </View>
      
      {adherencePercentage < 85 && (
        <View style={styles.adherenceWarning}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={styles.warningText}>
            目標の85%を下回っています
          </Text>
        </View>
      )}
    </View>
  );
};

const LabValuesChart = ({ period = 30 }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const range = getDateRange(period);
      const values = await DatabaseService.getLabValues(range.start, range.end);
      
      if (values.length > 0) {
        const processedData = processLabData(values);
        setData(processedData);
      }
    } catch (error) {
      console.error('Error loading lab values:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processLabData = (values) => {
    const sortedValues = values.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      labels: sortedValues.map(v => {
        const date = new Date(v.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      crpData: sortedValues.map(v => v.crp_value || 0),
      esrData: sortedValues.map(v => v.esr_value || 0),
      mmp3Data: sortedValues.map(v => v.mmp3_value || 0),
    };
  };

  if (isLoading) {
    return (
      <View style={[styles.chartContainer, commonStyles.centerContent]}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.chartContainer}>
        <Text style={commonStyles.subtitle}>検査値の推移</Text>
        <View style={styles.emptyChart}>
          <Ionicons name="analytics-outline" size={48} color={colors.gray} />
          <Text style={styles.emptyText}>検査値データがありません</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={commonStyles.subtitle}>検査値の推移</Text>
      
      {/* CRP */}
      <Text style={styles.labChartTitle}>CRP (mg/dL)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels: data.labels,
            datasets: [{
              data: data.crpData.length > 0 ? data.crpData : [0],
              color: (opacity = 1) => `rgba(208, 2, 27, ${opacity})`,
            }]
          }}
          width={Math.max(chartWidth, data.labels.length * 60)}
          height={180}
          chartConfig={{
            backgroundColor: colors.background,
            backgroundGradientFrom: colors.background,
            backgroundGradientTo: colors.background,
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(208, 2, 27, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 }
          }}
          style={styles.chart}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    marginBottom: spacing.lg,
  },
  
  chart: {
    marginVertical: spacing.sm,
    borderRadius: 16,
  },
  
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.lightGray,
    borderRadius: 16,
    marginVertical: spacing.sm,
  },
  
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  
  adherenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
  },
  
  adherenceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  adherencePercentage: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
  },
  
  adherenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  
  adherenceStats: {
    alignItems: 'center',
  },
  
  statItem: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  
  adherenceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightGray,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  
  warningText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  
  labChartTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});

export { SymptomChart, MedicationAdherenceChart, LabValuesChart };
