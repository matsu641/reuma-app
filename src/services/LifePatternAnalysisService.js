import AsyncStorage from '@react-native-async-storage/async-storage';
import DetailedHealthService from './DetailedHealthService';
import DatabaseService from './DatabaseService';

class LifePatternAnalysisService {
  constructor() {
    // 分析パターンの種類
    this.analysisTypes = {
      symptom_weather: {
        name: '天候と症状の関係',
        description: '天候変化が症状に与える影響を分析',
        icon: 'partly-sunny',
      },
      symptom_sleep: {
        name: '睡眠と症状の関係', 
        description: '睡眠の質が症状に与える影響を分析',
        icon: 'moon',
      },
      symptom_medication: {
        name: '服薬と症状の関係',
        description: '服薬状況が症状改善に与える効果を分析',
        icon: 'medical',
      },

      weekly_pattern: {
        name: '曜日別パターン',
        description: '曜日ごとの症状変化パターンを分析',
        icon: 'calendar',
      },
      monthly_trend: {
        name: '月間トレンド',
        description: '月間での症状変化の傾向を分析',
        icon: 'trending-up',
      },
      trigger_detection: {
        name: '症状悪化トリガー検出',
        description: '症状が悪化する要因を特定',
        icon: 'warning',
      },
    };

    // 相関関係の強度評価
    this.correlationStrength = {
      strong: { threshold: 0.7, label: '強い相関', color: '#FF6B6B' },
      moderate: { threshold: 0.5, label: '中程度の相関', color: '#4ECDC4' },
      weak: { threshold: 0.3, label: '弱い相関', color: '#45B7D1' },
      none: { threshold: 0, label: '相関なし', color: '#E0E0E0' },
    };
  }

  // メインの分析実行
  async generateFullAnalysis() {
    try {
      const analyses = {};
      
      // 各分析を並行実行
      const promises = Object.keys(this.analysisTypes).map(async (type) => {
        try {
          let result;
          switch (type) {
            case 'symptom_weather':
              result = await this.analyzeSymptomWeatherCorrelation();
              break;
            case 'symptom_sleep':
              result = await this.analyzeSymptomSleepCorrelation();
              break;
            case 'symptom_medication':
              result = await this.analyzeSymptomMedicationCorrelation();
              break;

            case 'weekly_pattern':
              result = await this.analyzeWeeklyPattern();
              break;
            case 'monthly_trend':
              result = await this.analyzeMonthlyTrend();
              break;
            case 'trigger_detection':
              result = await this.detectSymptomTriggers();
              break;
            default:
              result = { error: 'Unknown analysis type' };
          }
          return [type, result];
        } catch (error) {
          console.error(`Analysis error for ${type}:`, error);
          return [type, { error: error.message }];
        }
      });

      const results = await Promise.all(promises);
      results.forEach(([type, result]) => {
        analyses[type] = result;
      });

      // 分析結果を保存
      await this.saveAnalysisResults(analyses);
      
      return analyses;
    } catch (error) {
      console.error('Generate full analysis error:', error);
      throw error;
    }
  }

  // 天候と症状の相関分析
  async analyzeSymptomWeatherCorrelation() {
    try {
      const symptomLogs = await DetailedHealthService.getDetailedSymptomLogs(60);
      const correlations = {};
      
      if (symptomLogs.length < 7) {
        return { 
          insufficient_data: true, 
          message: '分析には少なくとも7日分のデータが必要です',
          data_count: symptomLogs.length 
        };
      }

      // 気圧と症状の相関
      const pressureSymptoms = symptomLogs
        .filter(log => log.environmental?.pressure)
        .map(log => ({
          pressure: log.environmental.pressure,
          pain: this.calculateOverallPain(log.jointSymptoms),
          stiffness: this.calculateOverallStiffness(log.jointSymptoms),
        }));

      if (pressureSymptoms.length > 0) {
        correlations.pressure_pain = this.calculateCorrelation(
          pressureSymptoms.map(d => d.pressure),
          pressureSymptoms.map(d => d.pain)
        );
        correlations.pressure_stiffness = this.calculateCorrelation(
          pressureSymptoms.map(d => d.pressure),
          pressureSymptoms.map(d => d.stiffness)
        );
      }

      // 湿度と症状の相関
      const humiditySymptoms = symptomLogs
        .filter(log => log.environmental?.humidity)
        .map(log => ({
          humidity: log.environmental.humidity,
          pain: this.calculateOverallPain(log.jointSymptoms),
          swelling: this.calculateOverallSwelling(log.jointSymptoms),
        }));

      if (humiditySymptoms.length > 0) {
        correlations.humidity_pain = this.calculateCorrelation(
          humiditySymptoms.map(d => d.humidity),
          humiditySymptoms.map(d => d.pain)
        );
        correlations.humidity_swelling = this.calculateCorrelation(
          humiditySymptoms.map(d => d.humidity),
          humiditySymptoms.map(d => d.swelling)
        );
      }

      return {
        correlations,
        insights: this.generateWeatherInsights(correlations),
        recommendations: this.generateWeatherRecommendations(correlations),
        data_count: symptomLogs.length,
      };
    } catch (error) {
      console.error('Weather correlation analysis error:', error);
      return { error: error.message };
    }
  }

  // 睡眠と症状の相関分析
  async analyzeSymptomSleepCorrelation() {
    try {
      const symptomLogs = await DetailedHealthService.getDetailedSymptomLogs(30);
      
      if (symptomLogs.length < 7) {
        return { 
          insufficient_data: true, 
          message: '分析には少なくとも7日分のデータが必要です' 
        };
      }

      const sleepSymptoms = symptomLogs
        .filter(log => log.generalSymptoms?.sleep)
        .map(log => ({
          duration: log.generalSymptoms.sleep.duration || 0,
          quality: log.generalSymptoms.sleep.quality || 0,
          interruptions: log.generalSymptoms.sleep.interruptions || 0,
          morning_stiffness: log.generalSymptoms.sleep.morning_stiffness || 0,
          overall_pain: this.calculateOverallPain(log.jointSymptoms),
          fatigue: log.generalSymptoms.fatigue?.physical || 0,
        }));

      const correlations = {
        duration_pain: this.calculateCorrelation(
          sleepSymptoms.map(d => d.duration),
          sleepSymptoms.map(d => d.overall_pain)
        ),
        quality_pain: this.calculateCorrelation(
          sleepSymptoms.map(d => d.quality),
          sleepSymptoms.map(d => d.overall_pain)
        ),
        quality_fatigue: this.calculateCorrelation(
          sleepSymptoms.map(d => d.quality),
          sleepSymptoms.map(d => d.fatigue)
        ),
        interruptions_stiffness: this.calculateCorrelation(
          sleepSymptoms.map(d => d.interruptions),
          sleepSymptoms.map(d => d.morning_stiffness)
        ),
      };

      return {
        correlations,
        insights: this.generateSleepInsights(correlations, sleepSymptoms),
        recommendations: this.generateSleepRecommendations(correlations),
        data_count: sleepSymptoms.length,
      };
    } catch (error) {
      console.error('Sleep correlation analysis error:', error);
      return { error: error.message };
    }
  }

  // 服薬と症状の相関分析
  async analyzeSymptomMedicationCorrelation() {
    try {
      const symptomLogs = await DetailedHealthService.getDetailedSymptomLogs(30);
      const medicationLogs = await DatabaseService.getMedicationLogs(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );

      if (symptomLogs.length < 7 || medicationLogs.length < 7) {
        return { 
          insufficient_data: true, 
          message: '分析には少なくとも7日分のデータが必要です' 
        };
      }

      // 日別の服薬率と症状の相関を計算
      const dailyData = this.combineDailyMedicationSymptomData(symptomLogs, medicationLogs);
      
      const correlations = {
        adherence_pain: this.calculateCorrelation(
          dailyData.map(d => d.adherence_rate),
          dailyData.map(d => d.pain)
        ),
        adherence_swelling: this.calculateCorrelation(
          dailyData.map(d => d.adherence_rate),
          dailyData.map(d => d.swelling)
        ),
        adherence_stiffness: this.calculateCorrelation(
          dailyData.map(d => d.adherence_rate),
          dailyData.map(d => d.stiffness)
        ),
      };

      return {
        correlations,
        insights: this.generateMedicationInsights(correlations, dailyData),
        recommendations: this.generateMedicationRecommendations(correlations),
        data_count: dailyData.length,
      };
    } catch (error) {
      console.error('Medication correlation analysis error:', error);
      return { error: error.message };
    }
  }

  // 曜日別パターン分析
  async analyzeWeeklyPattern() {
    try {
      const symptomLogs = await DetailedHealthService.getDetailedSymptomLogs(30);
      
      if (symptomLogs.length < 14) {
        return { 
          insufficient_data: true, 
          message: '分析には少なくとも14日分のデータが必要です' 
        };
      }

      const weeklyData = {};
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      
      // 曜日別にデータを分類
      dayNames.forEach((day, index) => {
        weeklyData[day] = {
          pain: [],
          fatigue: [],
          mood: [],
          sleep_quality: [],
        };
      });

      symptomLogs.forEach(log => {
        const dayOfWeek = new Date(log.date).getDay();
        const dayName = dayNames[dayOfWeek];
        
        weeklyData[dayName].pain.push(this.calculateOverallPain(log.jointSymptoms));
        weeklyData[dayName].fatigue.push(log.generalSymptoms?.fatigue?.physical || 0);
        weeklyData[dayName].mood.push(log.generalSymptoms?.mood || 3);
        weeklyData[dayName].sleep_quality.push(log.generalSymptoms?.sleep?.quality || 0);
      });

      // 各曜日の平均値を計算
      const weeklyAverages = {};
      Object.keys(weeklyData).forEach(day => {
        weeklyAverages[day] = {
          pain: this.calculateAverage(weeklyData[day].pain),
          fatigue: this.calculateAverage(weeklyData[day].fatigue),
          mood: this.calculateAverage(weeklyData[day].mood),
          sleep_quality: this.calculateAverage(weeklyData[day].sleep_quality),
          data_count: weeklyData[day].pain.length,
        };
      });

      return {
        weekly_averages: weeklyAverages,
        insights: this.generateWeeklyInsights(weeklyAverages),
        recommendations: this.generateWeeklyRecommendations(weeklyAverages),
        data_count: symptomLogs.length,
      };
    } catch (error) {
      console.error('Weekly pattern analysis error:', error);
      return { error: error.message };
    }
  }

  // 症状悪化トリガー検出
  async detectSymptomTriggers() {
    try {
      const symptomLogs = await DetailedHealthService.getDetailedSymptomLogs(60);
      
      if (symptomLogs.length < 14) {
        return { 
          insufficient_data: true, 
          message: '分析には少なくとも14日分のデータが必要です' 
        };
      }

      // 高症状日（上位25%）を特定
      const painScores = symptomLogs.map(log => this.calculateOverallPain(log.jointSymptoms));
      const highPainThreshold = this.calculatePercentile(painScores, 75);
      
      const highSymptomDays = symptomLogs.filter(log => 
        this.calculateOverallPain(log.jointSymptoms) >= highPainThreshold
      );

      const lowSymptomDays = symptomLogs.filter(log => 
        this.calculateOverallPain(log.jointSymptoms) < highPainThreshold
      );

      // 各要因の出現頻度を比較
      const triggers = await this.compareTriggerFactors(highSymptomDays, lowSymptomDays);

      return {
        triggers,
        high_symptom_threshold: highPainThreshold,
        insights: this.generateTriggerInsights(triggers),
        recommendations: this.generateTriggerRecommendations(triggers),
        data_count: symptomLogs.length,
      };
    } catch (error) {
      console.error('Trigger detection error:', error);
      return { error: error.message };
    }
  }

  // ヘルパーメソッド
  calculateOverallPain(jointSymptoms) {
    if (!jointSymptoms || Object.keys(jointSymptoms).length === 0) return 0;
    const pains = Object.values(jointSymptoms).map(s => s.pain || 0);
    return this.calculateAverage(pains);
  }

  calculateOverallSwelling(jointSymptoms) {
    if (!jointSymptoms || Object.keys(jointSymptoms).length === 0) return 0;
    const swellings = Object.values(jointSymptoms).map(s => s.swelling || 0);
    return this.calculateAverage(swellings);
  }

  calculateOverallStiffness(jointSymptoms) {
    if (!jointSymptoms || Object.keys(jointSymptoms).length === 0) return 0;
    const stiffness = Object.values(jointSymptoms).map(s => s.stiffness || 0);
    return this.calculateAverage(stiffness);
  }

  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  // 日別の服薬データと症状データを結合
  combineDailyMedicationSymptomData(symptomLogs, medicationLogs) {
    const combinedData = [];
    
    symptomLogs.forEach(symptomLog => {
      const dateStr = symptomLog.date;
      
      // その日の服薬ログを取得
      const dayMedicationLogs = medicationLogs.filter(medLog => 
        medLog.date === dateStr
      );
      
      // 服薬率を計算
      const totalScheduled = dayMedicationLogs.length;
      const takenCount = dayMedicationLogs.filter(medLog => medLog.taken === 1).length;
      const adherence_rate = totalScheduled > 0 ? takenCount / totalScheduled : 0;
      
      combinedData.push({
        date: dateStr,
        adherence_rate,
        pain: this.calculateOverallPain(symptomLog.jointSymptoms),
        swelling: this.calculateOverallSwelling(symptomLog.jointSymptoms),
        stiffness: this.calculateOverallStiffness(symptomLog.jointSymptoms),
        total_scheduled: totalScheduled,
        taken_count: takenCount,
      });
    });
    
    return combinedData;
  }

  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = this.calculateAverage(x);
    const meanY = this.calculateAverage(y);
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < x.length; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      sumXSquared += deltaX * deltaX;
      sumYSquared += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  calculatePercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // インサイト生成メソッド
  generateWeatherInsights(correlations) {
    const insights = [];
    
    if (Math.abs(correlations.pressure_pain) > 0.5) {
      insights.push({
        type: 'weather_pressure',
        severity: correlations.pressure_pain > 0 ? 'positive' : 'negative',
        message: `気圧の変化と痛みに${Math.abs(correlations.pressure_pain) > 0.7 ? '強い' : '中程度の'}相関が見られます`,
        correlation: correlations.pressure_pain,
      });
    }
    
    return insights;
  }

  generateSleepInsights(correlations, data) {
    const insights = [];
    
    if (correlations.quality_pain < -0.5) {
      insights.push({
        type: 'sleep_quality',
        severity: 'important',
        message: '睡眠の質が良いと痛みが軽減される傾向があります',
        correlation: correlations.quality_pain,
      });
    }
    
    return insights;
  }

  // 服薬関連の洞察生成
  generateMedicationInsights(correlations, dailyData) {
    const insights = [];
    
    if (correlations.adherence_pain < -0.5) {
      insights.push({
        type: 'medication_adherence',
        severity: 'important',
        message: '服薬遵守が痛みの軽減に効果的であることが示されています',
        correlation: correlations.adherence_pain,
      });
    }
    
    if (correlations.adherence_swelling < -0.4) {
      insights.push({
        type: 'medication_inflammation',
        severity: 'moderate',
        message: '定期的な服薬が腫れの軽減に寄与しています',
        correlation: correlations.adherence_swelling,
      });
    }
    
    // 服薬率の平均を計算
    const avgAdherence = this.calculateAverage(dailyData.map(d => d.adherence_rate));
    if (avgAdherence < 0.8) {
      insights.push({
        type: 'adherence_warning',
        severity: 'warning',
        message: `服薬遵守率が${(avgAdherence * 100).toFixed(1)}%と低めです`,
        average_adherence: avgAdherence,
      });
    }
    
    return insights;
  }

  // 症状悪化トリガーの要因比較
  async compareTriggerFactors(highSymptomDays, lowSymptomDays) {
    const triggers = [];
    
    // 天候要因の比較
    const weatherTrigger = await this.compareWeatherFactors(highSymptomDays, lowSymptomDays);
    if (weatherTrigger) triggers.push(weatherTrigger);
    
    // 睡眠要因の比較
    const sleepTrigger = this.compareSleepFactors(highSymptomDays, lowSymptomDays);
    if (sleepTrigger) triggers.push(sleepTrigger);
    
    // 曜日要因の比較
    const dayOfWeekTrigger = this.compareDayOfWeekFactors(highSymptomDays, lowSymptomDays);
    if (dayOfWeekTrigger) triggers.push(dayOfWeekTrigger);
    
    return triggers;
  }

  // 天候要因の比較
  async compareWeatherFactors(highDays, lowDays) {
    const highWeatherData = highDays.filter(day => day.environmental?.pressure);
    const lowWeatherData = lowDays.filter(day => day.environmental?.pressure);
    
    if (highWeatherData.length < 3 || lowWeatherData.length < 3) return null;
    
    const highPressure = this.calculateAverage(
      highWeatherData.map(d => d.environmental.pressure)
    );
    const lowPressure = this.calculateAverage(
      lowWeatherData.map(d => d.environmental.pressure)
    );
    
    const pressureDiff = Math.abs(highPressure - lowPressure);
    
    if (pressureDiff > 5) { // 5hPa以上の差
      return {
        type: 'weather_pressure',
        factor: '気圧',
        high_day_avg: highPressure,
        low_day_avg: lowPressure,
        difference: pressureDiff,
        severity: pressureDiff > 10 ? 'high' : 'medium',
        description: `症状の強い日は平均気圧が${highPressure > lowPressure ? '高く' : '低く'}なっています`,
      };
    }
    
    return null;
  }

  // 睡眠要因の比較
  compareSleepFactors(highDays, lowDays) {
    const highSleepData = highDays.filter(day => day.generalSymptoms?.sleep?.duration);
    const lowSleepData = lowDays.filter(day => day.generalSymptoms?.sleep?.duration);
    
    if (highSleepData.length < 3 || lowSleepData.length < 3) return null;
    
    const highSleepDuration = this.calculateAverage(
      highSleepData.map(d => d.generalSymptoms.sleep.duration)
    );
    const lowSleepDuration = this.calculateAverage(
      lowSleepData.map(d => d.generalSymptoms.sleep.duration)
    );
    
    const sleepDiff = Math.abs(highSleepDuration - lowSleepDuration);
    
    if (sleepDiff > 1) { // 1時間以上の差
      return {
        type: 'sleep_duration',
        factor: '睡眠時間',
        high_day_avg: highSleepDuration,
        low_day_avg: lowSleepDuration,
        difference: sleepDiff,
        severity: sleepDiff > 2 ? 'high' : 'medium',
        description: `症状の強い日は平均睡眠時間が${highSleepDuration < lowSleepDuration ? '短く' : '長く'}なっています`,
      };
    }
    
    return null;
  }

  // 曜日要因の比較
  compareDayOfWeekFactors(highDays, lowDays) {
    const highDayOfWeek = {};
    const lowDayOfWeek = {};
    
    // 曜日別に集計
    highDays.forEach(day => {
      const dayOfWeek = new Date(day.date).getDay();
      highDayOfWeek[dayOfWeek] = (highDayOfWeek[dayOfWeek] || 0) + 1;
    });
    
    lowDays.forEach(day => {
      const dayOfWeek = new Date(day.date).getDay();
      lowDayOfWeek[dayOfWeek] = (lowDayOfWeek[dayOfWeek] || 0) + 1;
    });
    
    // 最も頻度の高い曜日を特定
    const maxHighDay = Object.keys(highDayOfWeek).reduce((a, b) => 
      highDayOfWeek[a] > highDayOfWeek[b] ? a : b
    );
    
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const highDayFreq = highDayOfWeek[maxHighDay] / highDays.length;
    
    if (highDayFreq > 0.3) { // 30%以上の偏り
      return {
        type: 'day_of_week',
        factor: '曜日',
        problematic_day: dayNames[maxHighDay],
        frequency: highDayFreq,
        severity: highDayFreq > 0.5 ? 'high' : 'medium',
        description: `${dayNames[maxHighDay]}曜日に症状が悪化する傾向があります`,
      };
    }
    
    return null;
  }

  // トリガー洞察の生成
  generateTriggerInsights(triggers) {
    return triggers.map(trigger => ({
      type: trigger.type,
      factor: trigger.factor,
      severity: trigger.severity,
      description: trigger.description,
      recommendation: this.getTriggerRecommendation(trigger),
    }));
  }

  // トリガー推奨事項の生成
  generateTriggerRecommendations(triggers) {
    return triggers.map(trigger => ({
      type: 'trigger',
      factor: trigger.factor,
      title: `${trigger.factor}への対策`,
      description: this.getTriggerRecommendation(trigger),
      priority: trigger.severity === 'high' ? 'high' : 'medium',
    }));
  }

  // トリガー別推奨事項
  getTriggerRecommendation(trigger) {
    switch (trigger.type) {
      case 'weather_pressure':
        return '気圧変化の予報をチェックし、事前の温熱療法やストレッチを心がけましょう';
      case 'sleep_duration':
        return '規則正しい睡眠習慣を身につけ、適切な睡眠時間を確保しましょう';
      case 'day_of_week':
        return `${trigger.problematic_day}曜日は特に体調管理に注意し、予防的なケアを行いましょう`;
      default:
        return '医師と相談して適切な対策を検討しましょう';
    }
  }

  // 分析結果の保存
  async saveAnalysisResults(results) {
    try {
      const analysisHistory = await this.getAnalysisHistory();
      const newAnalysis = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        results,
      };
      
      analysisHistory.push(newAnalysis);
      
      // 過去30回分のみ保持
      const recentAnalyses = analysisHistory.slice(-30);
      
      await AsyncStorage.setItem('analysis_history', JSON.stringify(recentAnalyses));
    } catch (error) {
      console.error('Save analysis results error:', error);
    }
  }

  // 分析履歴の取得
  async getAnalysisHistory() {
    try {
      const history = await AsyncStorage.getItem('analysis_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Get analysis history error:', error);
      return [];
    }
  }

  // 最新の分析結果取得
  async getLatestAnalysis() {
    try {
      const history = await this.getAnalysisHistory();
      return history.length > 0 ? history[history.length - 1] : null;
    } catch (error) {
      console.error('Get latest analysis error:', error);
      return null;
    }
  }



  // 月間トレンド分析
  async analyzeMonthlyTrend() {
    try {
      const symptomLogs = await DetailedHealthService.getDetailedSymptomLogs(90);
      
      if (symptomLogs.length < 30) {
        return { 
          insufficient_data: true, 
          message: '分析には少なくとも30日分のデータが必要です' 
        };
      }

      // 月別にデータを分類
      const monthlyData = {};
      const currentDate = new Date();
      
      for (let i = 0; i < 3; i++) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = month.toISOString().substr(0, 7); // YYYY-MM format
        monthlyData[monthKey] = {
          pain: [],
          fatigue: [],
          mood: [],
          medication_adherence: [],
        };
      }

      symptomLogs.forEach(log => {
        const logDate = new Date(log.date);
        const monthKey = logDate.toISOString().substr(0, 7);
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].pain.push(this.calculateOverallPain(log.jointSymptoms));
          monthlyData[monthKey].fatigue.push(log.generalSymptoms?.fatigue?.physical || 0);
          monthlyData[monthKey].mood.push(log.generalSymptoms?.mood?.overall || 0);
        }
      });

      // トレンド計算
      const trends = {};
      const metrics = ['pain', 'fatigue', 'mood'];
      
      metrics.forEach(metric => {
        const monthlyAverages = Object.keys(monthlyData)
          .sort()
          .map(month => ({
            month,
            average: monthlyData[month][metric].length > 0 
              ? monthlyData[month][metric].reduce((a, b) => a + b) / monthlyData[month][metric].length
              : 0
          }))
          .filter(data => data.average > 0);

        if (monthlyAverages.length >= 2) {
          trends[metric] = {
            data: monthlyAverages,
            trend: this.calculateTrend(monthlyAverages.map(d => d.average)),
            change_rate: this.calculateChangeRate(monthlyAverages),
          };
        }
      });

      return {
        trends,
        insights: this.generateTrendInsights(trends),
        recommendations: this.generateTrendRecommendations(trends),
        data_count: symptomLogs.length,
      };
    } catch (error) {
      console.error('Monthly trend analysis error:', error);
      return { error: error.message };
    }
  }



  // トレンド計算
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 10) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  // 変化率計算
  calculateChangeRate(monthlyData) {
    if (monthlyData.length < 2) return 0;
    
    const first = monthlyData[0].average;
    const last = monthlyData[monthlyData.length - 1].average;
    
    return first === 0 ? 0 : ((last - first) / first) * 100;
  }



  // トレンド洞察生成
  generateTrendInsights(trends) {
    const insights = [];
    
    Object.entries(trends).forEach(([metric, trendData]) => {
      insights.push({
        metric,
        trend: trendData.trend,
        change_rate: trendData.change_rate,
        description: this.getTrendDescription(metric, trendData.trend, trendData.change_rate),
      });
    });
    
    return insights;
  }

  // トレンド説明文生成
  getTrendDescription(metric, trend, changeRate) {
    const metricNames = {
      pain: '痛み',
      fatigue: '疲労',
      mood: '気分',
    };
    
    const metricName = metricNames[metric] || metric;
    const rate = Math.abs(changeRate).toFixed(1);
    
    switch (trend) {
      case 'increasing':
        return `${metricName}が${rate}%悪化傾向にあります`;
      case 'decreasing':
        return `${metricName}が${rate}%改善傾向にあります`;
      default:
        return `${metricName}は安定しています`;
    }
  }



  // トレンド推奨事項生成
  generateTrendRecommendations(trends) {
    const recommendations = [];
    
    Object.entries(trends).forEach(([metric, trendData]) => {
      if (trendData.trend === 'increasing' && Math.abs(trendData.change_rate) > 20) {
        recommendations.push({
          type: 'trend',
          metric,
          title: `${metric}の改善対策`,
          description: `${metric}が悪化傾向にあります。医師に相談することをお勧めします`,
          priority: 'high',
        });
      }
    });
    
    return recommendations;
  }

  // 相関の強度評価
  getCorrelationStrength(correlation) {
    const abs = Math.abs(correlation);
    if (abs >= this.correlationStrength.strong.threshold) return 'strong';
    if (abs >= this.correlationStrength.moderate.threshold) return 'moderate';
    if (abs >= this.correlationStrength.weak.threshold) return 'weak';
    return 'none';
  }

  // 推奨事項生成
  generateWeatherRecommendations(correlations) {
    const recommendations = [];
    
    if (correlations.pressure_pain && correlations.pressure_pain > 0.5) {
      recommendations.push({
        type: 'weather',
        title: '気圧変化への対策',
        description: '低気圧の接近時は事前に温めやマッサージを行いましょう',
        priority: 'high',
      });
    }
    
    return recommendations;
  }

  generateSleepRecommendations(correlations) {
    const recommendations = [];
    
    if (correlations.quality_pain && correlations.quality_pain < -0.5) {
      recommendations.push({
        type: 'sleep',
        title: '睡眠の質の改善',
        description: '規則正しい睡眠習慣が症状軽減に効果的です',
        priority: 'high',
      });
    }
    
    return recommendations;
  }
}

export default new LifePatternAnalysisService();
