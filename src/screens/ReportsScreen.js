import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatDate, formatDateJapanese, getDateRange } from '../utils/dateUtils';
import DatabaseService from '../services/DatabaseService';

const ReportSection = ({ title, icon, children }) => (
  <View style={styles.reportSection}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const StatCard = ({ label, value, unit, trend, color = colors.textPrimary }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statValueContainer}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
    </View>
    {trend && (
      <View style={styles.trendContainer}>
        <Ionicons 
          name={trend > 0 ? "trending-up" : trend < 0 ? "trending-down" : "remove"} 
          size={14} 
          color={trend > 0 ? colors.danger : trend < 0 ? colors.success : colors.gray} 
        />
        <Text style={styles.trendText}>
          {trend > 0 ? '悪化' : trend < 0 ? '改善' : '安定'}
        </Text>
      </View>
    )}
  </View>
);

const ReportsScreen = ({ navigation }) => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateReport();
  }, [startDate, endDate]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const start = formatDate(startDate);
      const end = formatDate(endDate);

      // データを並行取得
      const [symptoms, medications, labValues, adherence] = await Promise.all([
        DatabaseService.getSymptomLogs(start, end),
        DatabaseService.getMedicationLogs(start, end),
        DatabaseService.getLabValues(start, end),
        DatabaseService.getMedicationAdherence(start, end)
      ]);

      // データを分析
      const analysisResult = analyzeData(symptoms, medications, labValues, adherence);
      setReportData(analysisResult);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('エラー', 'レポートの生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeData = (symptoms, medications, labValues, adherence) => {
    // 症状分析
    const avgPainScore = symptoms.length > 0 ? 
      symptoms.reduce((sum, s) => sum + s.pain_score, 0) / symptoms.length : 0;
    
    const avgStiffness = symptoms.length > 0 ? 
      symptoms.reduce((sum, s) => sum + (s.morning_stiffness_duration || 0), 0) / symptoms.length : 0;

    const recordDays = symptoms.length;
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const recordRate = totalDays > 0 ? (recordDays / totalDays) * 100 : 0;

    // 検査値分析
    const latestLabValues = labValues.length > 0 ? labValues[0] : null;

    return {
      period: {
        start: formatDate(startDate),
        end: formatDate(endDate),
        days: totalDays
      },
      symptoms: {
        recordDays,
        recordRate,
        avgPainScore: avgPainScore.toFixed(1),
        avgStiffness: Math.round(avgStiffness),
        trend: calculateTrend(symptoms, 'pain_score')
      },
      medication: {
        adherence: adherence.adherence || 0,
        totalScheduled: adherence.total || 0,
        totalTaken: adherence.taken || 0
      },
      labValues: latestLabValues,
      recommendations: generateRecommendations(avgPainScore, adherence.adherence || 0, recordRate)
    };
  };

  const calculateTrend = (data, field) => {
    if (data.length < 2) return 0;
    
    const recent = data.slice(0, Math.ceil(data.length / 2));
    const older = data.slice(Math.ceil(data.length / 2));
    
    const recentAvg = recent.reduce((sum, item) => sum + item[field], 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item[field], 0) / older.length;
    
    if (recentAvg > olderAvg + 0.5) return 1; // 悪化
    if (recentAvg < olderAvg - 0.5) return -1; // 改善
    return 0; // 安定
  };

  const generateRecommendations = (painScore, adherence, recordRate) => {
    const recommendations = [];
    
    if (adherence < 85) {
      recommendations.push('服薬遵守率の向上を目指しましょう');
    }
    
    if (recordRate < 70) {
      recommendations.push('症状記録をより継続的に行いましょう');
    }
    
    if (painScore > 5) {
      recommendations.push('痛みレベルが高めです。医師との相談をお勧めします');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('良好な自己管理ができています');
    }
    
    return recommendations;
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const shareReport = async () => {
    if (!reportData) return;

    try {
      const reportText = generateReportText(reportData);
      await Share.share({
        message: reportText,
        title: 'リウマチケア レポート'
      });
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('エラー', 'レポートの共有に失敗しました');
    }
  };

  const generateReportText = (data) => {
    return `
リウマチケア レポート
期間: ${formatDateJapanese(new Date(data.period.start))} ～ ${formatDateJapanese(new Date(data.period.end))}

【症状記録】
・記録日数: ${data.symptoms.recordDays}日 (${data.symptoms.recordRate.toFixed(0)}%)
・平均痛みレベル: ${data.symptoms.avgPainScore}/10
・平均朝のこわばり時間: ${data.symptoms.avgStiffness}分

【服薬状況】
・遵守率: ${data.medication.adherence.toFixed(0)}%
・予定回数: ${data.medication.totalScheduled}回
・服用回数: ${data.medication.totalTaken}回

${data.labValues ? `【最新検査値】
・CRP: ${data.labValues.crp_value || '未測定'} mg/dL
・ESR: ${data.labValues.esr_value || '未測定'} mm/h
・MMP-3: ${data.labValues.mmp3_value || '未測定'} ng/mL` : ''}

【推奨事項】
${data.recommendations.map(rec => `・${rec}`).join('\n')}

※このレポートは自己管理の参考としてご利用ください
※医療上の判断は必ず医師にご相談ください
    `.trim();
  };

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <Text>レポートを生成中...</Text>
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
        <Text style={styles.headerTitle}>診察レポート</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareReport}
          disabled={!reportData}
        >
          <Ionicons name="share-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelector}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={styles.dateLabel}>開始日</Text>
          <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
        </TouchableOpacity>
        
        <Text style={styles.dateConnector}>〜</Text>
        
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Text style={styles.dateLabel}>終了日</Text>
          <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
        </TouchableOpacity>
      </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          maximumDate={endDate}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={startDate}
          maximumDate={new Date()}
        />
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {reportData && (
          <>
            <ReportSection title="症状記録サマリー" icon="body-outline">
              <View style={styles.statsGrid}>
                <StatCard
                  label="記録日数"
                  value={reportData.symptoms.recordDays}
                  unit="日"
                />
                <StatCard
                  label="記録率"
                  value={Math.round(reportData.symptoms.recordRate)}
                  unit="%"
                />
                <StatCard
                  label="平均痛みレベル"
                  value={reportData.symptoms.avgPainScore}
                  unit="/10"
                  trend={reportData.symptoms.trend}
                />
                <StatCard
                  label="平均こわばり時間"
                  value={reportData.symptoms.avgStiffness}
                  unit="分"
                />
              </View>
            </ReportSection>

            <ReportSection title="服薬管理サマリー" icon="medical-outline">
              <View style={styles.statsGrid}>
                <StatCard
                  label="遵守率"
                  value={Math.round(reportData.medication.adherence)}
                  unit="%"
                  color={reportData.medication.adherence >= 85 ? colors.success : colors.warning}
                />
                <StatCard
                  label="予定回数"
                  value={reportData.medication.totalScheduled}
                  unit="回"
                />
                <StatCard
                  label="服用回数"
                  value={reportData.medication.totalTaken}
                  unit="回"
                />
              </View>
            </ReportSection>

            {reportData.labValues && (
              <ReportSection title="最新検査値" icon="analytics-outline">
                <View style={styles.labValuesContainer}>
                  <Text style={styles.labDate}>
                    検査日: {formatDateJapanese(new Date(reportData.labValues.date))}
                  </Text>
                  <View style={styles.statsGrid}>
                    {reportData.labValues.crp_value && (
                      <StatCard
                        label="CRP"
                        value={reportData.labValues.crp_value}
                        unit="mg/dL"
                      />
                    )}
                    {reportData.labValues.esr_value && (
                      <StatCard
                        label="ESR"
                        value={reportData.labValues.esr_value}
                        unit="mm/h"
                      />
                    )}
                    {reportData.labValues.mmp3_value && (
                      <StatCard
                        label="MMP-3"
                        value={reportData.labValues.mmp3_value}
                        unit="ng/mL"
                      />
                    )}
                  </View>
                </View>
              </ReportSection>
            )}

            <ReportSection title="推奨事項" icon="bulb-outline">
              <View style={styles.recommendationsContainer}>
                {reportData.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            </ReportSection>

            <View style={styles.disclaimerContainer}>
              <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
              <Text style={styles.disclaimerText}>
                このレポートは自己管理の参考としてご利用ください。医療上の判断は必ず医師にご相談ください。
              </Text>
            </View>
          </>
        )}
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
  
  shareButton: {
    padding: spacing.xs,
  },
  
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lightGray,
  },
  
  dateButton: {
    flex: 1,
    alignItems: 'center',
  },
  
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  dateValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  
  dateConnector: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  
  content: {
    flex: 1,
  },
  
  reportSection: {
    ...commonStyles.card,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  statCard: {
    width: '48%',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  
  statUnit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  trendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  
  labValuesContainer: {
    marginBottom: spacing.sm,
  },
  
  labDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  
  recommendationsContainer: {
    marginTop: spacing.sm,
  },
  
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  
  recommendationText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.lightGray,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
    borderRadius: 8,
  },
  
  disclaimerText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    lineHeight: 16,
  },
});

export default ReportsScreen;
