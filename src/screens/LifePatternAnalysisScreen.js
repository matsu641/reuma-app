import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatDateJapanese } from '../utils/dateUtils';
import LifePatternAnalysisService from '../services/LifePatternAnalysisService';

const { width } = Dimensions.get('window');

const chartConfig = {
  backgroundColor: colors.primary,
  backgroundGradientFrom: colors.primary,
  backgroundGradientTo: colors.secondary,
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: colors.primary
  }
};

const CorrelationCard = ({ title, correlation, description, icon }) => {
  const getStrength = (corr) => {
    const abs = Math.abs(corr);
    if (abs >= 0.7) return { label: '強い相関', color: colors.error };
    if (abs >= 0.5) return { label: '中程度の相関', color: colors.warning };
    if (abs >= 0.3) return { label: '弱い相関', color: colors.info };
    return { label: '相関なし', color: colors.gray };
  };

  const strength = getStrength(correlation);
  const isPositive = correlation > 0;

  return (
    <View style={styles.correlationCard}>
      <View style={styles.correlationHeader}>
        <View style={styles.correlationIcon}>
          <Ionicons name={icon} size={24} color={strength.color} />
        </View>
        <View style={styles.correlationInfo}>
          <Text style={styles.correlationTitle}>{title}</Text>
          <Text style={styles.correlationDescription}>{description}</Text>
        </View>
      </View>
      
      <View style={styles.correlationMeter}>
        <View style={styles.correlationValue}>
          <Text style={styles.correlationNumber}>
            {(correlation * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.correlationStrength, { color: strength.color }]}>
            {strength.label}
          </Text>
        </View>
        
        <View style={styles.correlationBar}>
          <View 
            style={[
              styles.correlationFill,
              {
                width: `${Math.abs(correlation) * 100}%`,
                backgroundColor: strength.color,
                alignSelf: isPositive ? 'flex-end' : 'flex-start',
              }
            ]}
          />
        </View>
        
        <View style={styles.correlationLabels}>
          <Text style={styles.correlationLabel}>負の相関</Text>
          <Text style={styles.correlationLabel}>正の相関</Text>
        </View>
      </View>
    </View>
  );
};

const InsightCard = ({ insight }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.info;
      default: return colors.primary;
    }
  };

  return (
    <View style={[styles.insightCard, { borderLeftColor: getSeverityColor(insight.severity) }]}>
      <Text style={styles.insightMessage}>{insight.message}</Text>
      {insight.recommendation && (
        <Text style={styles.insightRecommendation}>{insight.recommendation}</Text>
      )}
    </View>
  );
};

const WeeklyPatternChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>データが不足しています</Text>
      </View>
    );
  }

  const days = ['月', '火', '水', '木', '金', '土', '日'];
  const painData = days.map(day => data[day]?.pain || 0);
  const fatigueData = days.map(day => data[day]?.fatigue || 0);

  const chartData = {
    labels: days,
    datasets: [
      {
        data: painData,
        color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: fatigueData,
        color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
        strokeWidth: 2,
      }
    ],
    legend: ['痛み', '疲労'],
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>曜日別症状パターン</Text>
      <LineChart
        data={chartData}
        width={width - 40}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const TriggerAnalysis = ({ triggers }) => {
  if (!triggers || triggers.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>トリガーが検出されませんでした</Text>
      </View>
    );
  }

  return (
    <View style={styles.triggerContainer}>
      <Text style={styles.sectionTitle}>症状悪化トリガー</Text>
      {triggers.map((trigger, index) => (
        <View key={index} style={styles.triggerItem}>
          <View style={styles.triggerHeader}>
            <Ionicons 
              name="warning" 
              size={20} 
              color={colors.error} 
            />
            <Text style={styles.triggerName}>{trigger.name}</Text>
            <Text style={styles.triggerRisk}>{trigger.risk_level}</Text>
          </View>
          <Text style={styles.triggerDescription}>{trigger.description}</Text>
          {trigger.recommendation && (
            <Text style={styles.triggerRecommendation}>
              💡 {trigger.recommendation}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const TrendItem = ({ title, trend, icon }) => {
  const getTrendInfo = (trend) => {
    switch (trend) {
      case 'improving':
        return { icon: 'trending-down', color: colors.success, text: '改善傾向' };
      case 'worsening':
        return { icon: 'trending-up', color: colors.danger, text: '悪化傾向' };
      case 'stable':
        return { icon: 'remove', color: colors.info, text: '安定' };
      default:
        return { icon: 'help-circle', color: colors.gray, text: 'データ不足' };
    }
  };

  const trendInfo = getTrendInfo(trend);

  return (
    <View style={styles.trendItem}>
      <View style={styles.trendLeft}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.trendTitle}>{title}</Text>
      </View>
      <View style={styles.trendRight}>
        <Ionicons name={trendInfo.icon} size={16} color={trendInfo.color} />
        <Text style={[styles.trendText, { color: trendInfo.color }]}>
          {trendInfo.text}
        </Text>
      </View>
    </View>
  );
};

const RecommendationCard = ({ type, title, description, actions, priority }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.info;
      default: return colors.primary;
    }
  };

  return (
    <View style={styles.recommendationCard}>
      <View style={styles.recommendationHeader}>
        <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(priority) }]} />
        <Text style={styles.recommendationTitle}>{title}</Text>
      </View>
      <Text style={styles.recommendationDescription}>{description}</Text>
      {actions && actions.length > 0 && (
        <View style={styles.actionList}>
          {actions.map((action, index) => (
            <Text key={index} style={styles.actionItem}>• {action}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

const LifePatternAnalysisScreen = ({ navigation }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [integratedData, setIntegratedData] = useState(null);

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      // まず最新の分析結果をチェック
      let data = await LifePatternAnalysisService.getLatestAnalysis();
      
      // データがない、または古い場合は新しい分析を実行
      const shouldRunNewAnalysis = !data || 
        (new Date() - new Date(data.timestamp)) > 24 * 60 * 60 * 1000; // 24時間以上古い

      if (shouldRunNewAnalysis) {
        const newAnalysis = await LifePatternAnalysisService.generateFullAnalysis();
        data = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          results: newAnalysis,
        };
      }
      
      setAnalysisData(data);

      // 統合健康データ分析も読み込み
      const integrated = await LifePatternAnalysisService.getIntegratedHealthAnalysis(30);
      setIntegratedData(integrated);
    } catch (error) {
      console.error('Load analysis data error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalysisData();
  };

  const runNewAnalysis = async () => {
    setIsLoading(true);
    try {
      const newAnalysis = await LifePatternAnalysisService.generateFullAnalysis();
      const data = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        results: newAnalysis,
      };
      setAnalysisData(data);
    } catch (error) {
      console.error('Run new analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverviewTab = () => {
    if (!integratedData) return <Text style={styles.loadingText}>データを読み込み中...</Text>;

    const { summary, trends, insights } = integratedData;

    return (
      <View>
        {/* 健康データサマリー */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>健康データ概要</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.recordDays}</Text>
              <Text style={styles.summaryLabel}>記録日数</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.avgPainLevel}</Text>
              <Text style={styles.summaryLabel}>平均痛みレベル</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.medicationAdherence}%</Text>
              <Text style={styles.summaryLabel}>服薬遵守率</Text>
            </View>
            {summary.latestCRP && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.latestCRP}</Text>
                <Text style={styles.summaryLabel}>最新CRP</Text>
              </View>
            )}
          </View>
        </View>

        {/* トレンド分析 */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>トレンド分析</Text>
          <TrendItem
            title="症状トレンド"
            trend={trends.symptomTrend}
            icon="body"
          />
          <TrendItem
            title="服薬遵守トレンド"
            trend={trends.adherenceTrend}
            icon="medical"
          />
          <TrendItem
            title="炎症指標トレンド"
            trend={trends.inflammationTrend}
            icon="analytics"
          />
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    if (!analysisData?.results) return null;

    const { results } = analysisData;

    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'correlations':
        return (
          <View>
            {/* 天候との相関 */}
            {results.symptom_weather?.correlations && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>天候との相関</Text>
                <CorrelationCard
                  title="気圧と痛み"
                  correlation={results.symptom_weather.correlations.pressure_pain || 0}
                  description="気圧の変化が痛みに与える影響"
                  icon="partly-sunny"
                />
                <CorrelationCard
                  title="湿度と腫脹"
                  correlation={results.symptom_weather.correlations.humidity_swelling || 0}
                  description="湿度の変化が腫脹に与える影響"
                  icon="water"
                />
              </View>
            )}

            {/* 睡眠との相関 */}
            {results.symptom_sleep?.correlations && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>睡眠との相関</Text>
                <CorrelationCard
                  title="睡眠の質と痛み"
                  correlation={results.symptom_sleep.correlations.quality_pain || 0}
                  description="睡眠の質が痛みに与える影響"
                  icon="moon"
                />
                <CorrelationCard
                  title="睡眠の質と疲労"
                  correlation={results.symptom_sleep.correlations.quality_fatigue || 0}
                  description="睡眠の質が疲労に与える影響"
                  icon="battery-dead"
                />
              </View>
            )}

            {/* 服薬との相関 */}
            {results.symptom_medication?.correlations && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>服薬との相関</Text>
                <CorrelationCard
                  title="服薬率と痛み"
                  correlation={results.symptom_medication.correlations.adherence_pain || 0}
                  description="服薬の継続が痛みに与える効果"
                  icon="medical"
                />
                <CorrelationCard
                  title="服薬率と腫脹"
                  correlation={results.symptom_medication.correlations.adherence_swelling || 0}
                  description="服薬の継続が腫脹に与える効果"
                  icon="medical-outline"
                />
              </View>
            )}
          </View>
        );

      case 'patterns':
        return (
          <View>
            {/* 曜日別パターン */}
            {results.weekly_pattern?.weekly_averages && (
              <View style={styles.section}>
                <WeeklyPatternChart data={results.weekly_pattern.weekly_averages} />
              </View>
            )}

            {/* トリガー分析 */}
            {results.trigger_detection?.triggers && (
              <View style={styles.section}>
                <TriggerAnalysis triggers={results.trigger_detection.triggers} />
              </View>
            )}
          </View>
        );

      case 'insights':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>個人化されたインサイト</Text>
            
            {/* 天候インサイト */}
            {results.symptom_weather?.insights?.map((insight, index) => (
              <InsightCard key={`weather-${index}`} insight={insight} />
            ))}
            
            {/* 睡眠インサイト */}
            {results.symptom_sleep?.insights?.map((insight, index) => (
              <InsightCard key={`sleep-${index}`} insight={insight} />
            ))}
            
            {/* 服薬インサイト */}
            {results.symptom_medication?.insights?.map((insight, index) => (
              <InsightCard key={`medication-${index}`} insight={insight} />
            ))}

            {/* 推奨事項 */}
            <Text style={styles.sectionTitle}>推奨事項</Text>
            {Object.values(results).map((result, index) => 
              result.recommendations?.map((rec, recIndex) => (
                <View key={`rec-${index}-${recIndex}`} style={styles.recommendationCard}>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.recommendationDescription}>{rec.description}</Text>
                </View>
              ))
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading && !analysisData) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={styles.loadingText}>分析を実行中...</Text>
        <Text style={styles.loadingSubtext}>症状データを解析しています</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>生活パターン分析</Text>
          {analysisData && (
            <Text style={styles.headerDate}>
              {formatDateJapanese(new Date(analysisData.timestamp))}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={runNewAnalysis}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* タブナビゲーション */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            総合データ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'correlations' && styles.activeTab]}
          onPress={() => setSelectedTab('correlations')}
        >
          <Text style={[styles.tabText, selectedTab === 'correlations' && styles.activeTabText]}>
            相関分析
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'patterns' && styles.activeTab]}
          onPress={() => setSelectedTab('patterns')}
        >
          <Text style={[styles.tabText, selectedTab === 'patterns' && styles.activeTabText]}>
            パターン
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'insights' && styles.activeTab]}
          onPress={() => setSelectedTab('insights')}
        >
          <Text style={[styles.tabText, selectedTab === 'insights' && styles.activeTabText]}>
            インサイト
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </View>
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
    padding: spacing.lg,
    paddingTop: 50,
    backgroundColor: colors.primary,
  },
  
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  
  headerTitleText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  headerDate: {
    fontSize: fontSize.sm,
    color: '#fff',
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  
  tabText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  
  section: {
    marginBottom: spacing.xl,
  },
  
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  // 相関カード
  correlationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  correlationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  
  correlationInfo: {
    flex: 1,
  },
  
  correlationTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  correlationDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  
  correlationMeter: {
    alignItems: 'center',
  },
  
  correlationValue: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  correlationNumber: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  correlationStrength: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  
  correlationBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  
  correlationFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  correlationLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  
  correlationLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  
  // チャート
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  
  // インサイトカード
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  insightMessage: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  
  insightRecommendation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  
  // 推奨事項カード
  recommendationCard: {
    backgroundColor: colors.lightBlue,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  
  recommendationTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  recommendationDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  
  // トリガー分析
  triggerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  triggerItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  
  triggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  triggerName: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  
  triggerRisk: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: '600',
  },
  
  triggerDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  triggerRecommendation: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontStyle: 'italic',
  },
  
  // その他
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  
  loadingSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  
  noDataContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  
  noDataText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // 総合データタブ用のスタイル
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },

  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  trendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trendTitle: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },

  trendRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trendText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },

  recommendationCard: {
    backgroundColor: colors.lightGray,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },

  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  priorityIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: spacing.sm,
  },

  recommendationTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  recommendationDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  actionList: {
    marginTop: spacing.xs,
  },

  actionItem: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    margin: spacing.lg,
  },
});

export default LifePatternAnalysisScreen;
