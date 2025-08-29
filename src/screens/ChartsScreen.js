import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { SymptomChart, MedicationAdherenceChart, LabValuesChart } from '../components/Charts';

const PeriodSelector = ({ selectedPeriod, onPeriodChange }) => {
  const periods = [
    { value: 7, label: '7日' },
    { value: 14, label: '14日' },
    { value: 30, label: '30日' },
    { value: 90, label: '90日' },
  ];

  return (
    <View style={styles.periodSelector}>
      <Text style={styles.periodLabel}>期間:</Text>
      <View style={styles.periodButtons}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodButton,
              selectedPeriod === period.value && styles.periodButtonActive
            ]}
            onPress={() => onPeriodChange(period.value)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period.value && styles.periodButtonTextActive
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const ChartSection = ({ title, icon, children }) => (
  <View style={commonStyles.card}>
    <View style={styles.chartHeader}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={styles.chartTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const ChartsScreen = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>データ分析</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => navigation.navigate('Reports')}
        >
          <Ionicons name="share-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.periodContainer}>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ChartSection title="症状の推移" icon="body-outline">
          <SymptomChart period={selectedPeriod} />
        </ChartSection>

        <ChartSection title="服薬遵守率" icon="medical-outline">
          <MedicationAdherenceChart period={selectedPeriod} />
        </ChartSection>

        <ChartSection title="検査値の推移" icon="analytics-outline">
          <LabValuesChart period={selectedPeriod} />
        </ChartSection>

        {/* データサマリー */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>データサマリー</Text>
          <DataSummary period={selectedPeriod} />
        </View>

        {/* インサイト */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>分析結果</Text>
          <InsightsSection period={selectedPeriod} />
        </View>
      </ScrollView>
    </View>
  );
};

const DataSummary = ({ period }) => {
  const [summaryData, setSummaryData] = useState(null);

  React.useEffect(() => {
    loadSummaryData();
  }, [period]);

  const loadSummaryData = async () => {
    try {
      // ここで実際のデータを読み込む
      // 簡易実装として静的データを表示
      setSummaryData({
        recordDays: Math.floor(period * 0.7), // 記録日数
        avgPainScore: 3.2,
        medicationAdherence: 87,
        improvementTrend: 'stable'
      });
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  if (!summaryData) {
    return <Text>読み込み中...</Text>;
  }

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{summaryData.recordDays}</Text>
        <Text style={styles.summaryLabel}>記録日数</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{summaryData.avgPainScore}</Text>
        <Text style={styles.summaryLabel}>平均痛みレベル</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{summaryData.medicationAdherence}%</Text>
        <Text style={styles.summaryLabel}>服薬遵守率</Text>
      </View>
    </View>
  );
};

const InsightsSection = ({ period }) => {
  const insights = [
    {
      type: 'positive',
      icon: 'trending-up',
      text: '服薬遵守率が目標の85%を上回っています'
    },
    {
      type: 'neutral',
      icon: 'information-circle',
      text: '痛みレベルは比較的安定しています'
    },
    {
      type: 'suggestion',
      icon: 'bulb',
      text: '朝のこわばり時間を継続的に記録することをお勧めします'
    }
  ];

  const getInsightColor = (type) => {
    switch (type) {
      case 'positive': return colors.success;
      case 'warning': return colors.warning;
      case 'negative': return colors.danger;
      default: return colors.primary;
    }
  };

  return (
    <View>
      {insights.map((insight, index) => (
        <View key={index} style={styles.insightItem}>
          <Ionicons 
            name={insight.icon} 
            size={20} 
            color={getInsightColor(insight.type)} 
          />
          <Text style={styles.insightText}>{insight.text}</Text>
        </View>
      ))}
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
  
  shareButton: {
    padding: spacing.xs,
  },
  
  periodContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  periodLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  
  periodButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    marginRight: spacing.sm,
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
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
  },
  
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  
  summaryItem: {
    alignItems: 'center',
  },
  
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  
  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
});

export default ChartsScreen;
