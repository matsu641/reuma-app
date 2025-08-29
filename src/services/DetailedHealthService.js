import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

class DetailedHealthService {
  constructor() {
    // 関節の部位定義
    this.jointAreas = {
      // 上肢
      shoulders: { label: '肩関節', category: '上肢', x: 50, y: 20, size: 'large' },
      elbows: { label: '肘関節', category: '上肢', x: 50, y: 35, size: 'medium' },
      wrists: { label: '手首', category: '上肢', x: 50, y: 45, size: 'small' },
      fingers: { label: '指関節', category: '上肢', x: 50, y: 55, size: 'small' },
      
      // 体幹
      neck: { label: '頸椎', category: '体幹', x: 50, y: 10, size: 'small' },
      spine: { label: '脊椎', category: '体幹', x: 50, y: 30, size: 'large' },
      
      // 下肢
      hips: { label: '股関節', category: '下肢', x: 50, y: 60, size: 'large' },
      knees: { label: '膝関節', category: '下肢', x: 50, y: 75, size: 'medium' },
      ankles: { label: '足首', category: '下肢', x: 50, y: 85, size: 'small' },
      toes: { label: '足趾関節', category: '下肢', x: 50, y: 95, size: 'small' },
    };

    // 症状の種類
    this.symptomTypes = {
      pain: { label: '痛み', color: '#FF6B6B', levels: [1, 2, 3, 4, 5] },
      swelling: { label: '腫脹', color: '#4ECDC4', levels: [1, 2, 3, 4, 5] },
      stiffness: { label: 'こわばり', color: '#45B7D1', levels: [1, 2, 3, 4, 5] },
      redness: { label: '発赤', color: '#F9A825', levels: [1, 2, 3] },
      warmth: { label: '熱感', color: '#E85D75', levels: [1, 2, 3] },
    };

    // 疲労度レベル
    this.fatigueTypes = {
      physical: { label: '身体的疲労', levels: [1, 2, 3, 4, 5] },
      mental: { label: '精神的疲労', levels: [1, 2, 3, 4, 5] },
      overall: { label: '全体的疲労', levels: [1, 2, 3, 4, 5] },
    };

    // 睡眠の質
    this.sleepQuality = {
      duration: { label: '睡眠時間', unit: '時間', range: [1, 12] },
      quality: { label: '睡眠の質', levels: [1, 2, 3, 4, 5] },
      interruptions: { label: '中途覚醒回数', range: [0, 10] },
      morning_stiffness: { label: '朝のこわばり', levels: [1, 2, 3, 4, 5] },
    };
  }

  // 詳細症状記録の保存
  async saveDetailedSymptomLog(data) {
    try {
      const timestamp = new Date().toISOString();
      const detailedLog = {
        id: Date.now(),
        timestamp,
        date: data.date || new Date().toISOString().split('T')[0],
        
        // 関節症状
        jointSymptoms: data.jointSymptoms || {},
        
        // 全身症状
        generalSymptoms: {
          fatigue: data.fatigue || {},
          sleep: data.sleep || {},
          mood: data.mood || 3,
          stress: data.stress || 3,
        },
        
        // 環境要因
        environmental: {
          weather: data.weather || {},
          temperature: data.temperature || null,
          humidity: data.humidity || null,
          pressure: data.pressure || null,
        },
        
        // 生活習慣
        lifestyle: {
          exercise: data.exercise || null,
          diet: data.diet || [],
          alcohol: data.alcohol || false,
          smoking: data.smoking || false,
        },
        
        // メモ
        notes: data.notes || '',
        
        // 写真
        photos: data.photos || [],
        
        // 音声メモ
        voiceMemo: data.voiceMemo || null,
      };

      const existingLogs = await this.getDetailedSymptomLogs(30);
      existingLogs.push(detailedLog);

      // 過去90日分のみ保持
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const filteredLogs = existingLogs.filter(
        log => new Date(log.timestamp) > ninetyDaysAgo
      );

      await AsyncStorage.setItem('detailed_symptom_logs', JSON.stringify(filteredLogs));
      
      // 基本的な症状記録も保存（既存システムとの互換性）
      if (data.overallPainScore) {
        await DatabaseService.addSymptomLog(
          data.date,
          data.overallPainScore,
          data.sleep?.morning_stiffness || 0,
          data.notes
        );
      }

      return detailedLog;
    } catch (error) {
      console.error('Save detailed symptom log error:', error);
      throw error;
    }
  }

  // 詳細症状記録の取得
  async getDetailedSymptomLogs(days = 30) {
    try {
      const logs = await AsyncStorage.getItem('detailed_symptom_logs');
      const allLogs = logs ? JSON.parse(logs) : [];
      
      if (days > 0) {
        const targetDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return allLogs.filter(log => new Date(log.timestamp) > targetDate);
      }
      
      return allLogs;
    } catch (error) {
      console.error('Get detailed symptom logs error:', error);
      return [];
    }
  }

  // 今日の詳細症状記録を取得
  async getTodayDetailedLog() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logs = await this.getDetailedSymptomLogs(1);
      return logs.find(log => log.date === today) || null;
    } catch (error) {
      console.error('Get today detailed log error:', error);
      return null;
    }
  }

  // 関節症状のサマリー取得
  async getJointSymptomsSummary(days = 7) {
    try {
      const logs = await this.getDetailedSymptomLogs(days);
      const summary = {};

      Object.keys(this.jointAreas).forEach(joint => {
        summary[joint] = {
          pain: { total: 0, count: 0, average: 0 },
          swelling: { total: 0, count: 0, average: 0 },
          stiffness: { total: 0, count: 0, average: 0 },
        };
      });

      logs.forEach(log => {
        Object.entries(log.jointSymptoms || {}).forEach(([joint, symptoms]) => {
          if (summary[joint]) {
            Object.entries(symptoms).forEach(([symptom, level]) => {
              if (summary[joint][symptom] && level > 0) {
                summary[joint][symptom].total += level;
                summary[joint][symptom].count += 1;
              }
            });
          }
        });
      });

      // 平均値計算
      Object.keys(summary).forEach(joint => {
        Object.keys(summary[joint]).forEach(symptom => {
          const data = summary[joint][symptom];
          data.average = data.count > 0 ? data.total / data.count : 0;
        });
      });

      return summary;
    } catch (error) {
      console.error('Get joint symptoms summary error:', error);
      return {};
    }
  }

  // 疲労度の推移取得
  async getFatigueTrend(days = 30) {
    try {
      const logs = await this.getDetailedSymptomLogs(days);
      return logs.map(log => ({
        date: log.date,
        physical: log.generalSymptoms?.fatigue?.physical || 0,
        mental: log.generalSymptoms?.fatigue?.mental || 0,
        overall: log.generalSymptoms?.fatigue?.overall || 0,
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Get fatigue trend error:', error);
      return [];
    }
  }

  // 睡眠の質の推移取得
  async getSleepTrend(days = 30) {
    try {
      const logs = await this.getDetailedSymptomLogs(days);
      return logs.map(log => ({
        date: log.date,
        duration: log.generalSymptoms?.sleep?.duration || 0,
        quality: log.generalSymptoms?.sleep?.quality || 0,
        interruptions: log.generalSymptoms?.sleep?.interruptions || 0,
        morning_stiffness: log.generalSymptoms?.sleep?.morning_stiffness || 0,
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Get sleep trend error:', error);
      return [];
    }
  }

  // 症状の重要度判定
  getSymptomSeverity(symptom, level) {
    if (level >= 4) return 'severe';
    if (level >= 3) return 'moderate';
    if (level >= 2) return 'mild';
    return 'none';
  }

  // 症状の色取得
  getSymptomColor(symptom, level) {
    const baseColor = this.symptomTypes[symptom]?.color || '#999';
    const opacity = Math.max(0.2, level / 5);
    return baseColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
  }

  // 関節の表示サイズ取得
  getJointDisplaySize(joint, level) {
    const baseSize = this.jointAreas[joint]?.size || 'medium';
    const sizeMap = {
      small: { base: 20, multiplier: 1.5 },
      medium: { base: 30, multiplier: 2 },
      large: { base: 40, multiplier: 2.5 }
    };
    
    const config = sizeMap[baseSize];
    return config.base + (level * config.multiplier);
  }
}

export default new DetailedHealthService();
