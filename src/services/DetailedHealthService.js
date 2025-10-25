import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

class DetailedHealthService {
  constructor() {
    // 関節の部位定義（人体図の前面・背面に合わせた座標）
    // 前面（左側の人体図）の関節位置
    this.frontJointAreas = {
      // 頭部・頸部
      neck: { label: '頸椎', category: '体幹', x: 22, y: 12, size: 'small' },
      
      // 上肢（前面から見た左右）
      left_shoulder: { label: '左肩関節', category: '上肢', x: 32, y: 25, size: 'large' },
      right_shoulder: { label: '右肩関節', category: '上肢', x: 13, y: 25, size: 'large' },
      left_elbow: { label: '左肘関節', category: '上肢', x: 35, y: 38, size: 'medium' },
      right_elbow: { label: '右肘関節', category: '上肢', x: 11, y: 38, size: 'medium' },
      left_wrist: { label: '左手首', category: '上肢', x: 43, y: 48, size: 'small' },
      right_wrist: { label: '右手首', category: '上肢', x: 5, y: 48, size: 'small' },
      left_fingers: { label: '左指関節', category: '上肢', x: 44, y: 53, size: 'small' },
      right_fingers: { label: '右指関節', category: '上肢', x: 3, y: 53, size: 'small' },
      
      // 体幹（前面）
      chest: { label: '胸部', category: '体幹', x: 23, y: 32, size: 'medium' },
      abdomen: { label: '腹部', category: '体幹', x: 23, y: 43, size: 'medium' },
      
      // 下肢（前面から見た左右）
      left_hip: { label: '左股関節', category: '下肢', x: 29, y: 58, size: 'large' },
      right_hip: { label: '右股関節', category: '下肢', x: 17, y: 58, size: 'large' },
      left_knee: { label: '左膝関節', category: '下肢', x: 29, y: 68, size: 'medium' },
      right_knee: { label: '右膝関節', category: '下肢', x: 17, y: 68, size: 'medium' },
      left_ankle: { label: '左足首', category: '下肢', x: 30, y: 82, size: 'small' },
      right_ankle: { label: '右足首', category: '下肢', x: 16, y: 82, size: 'small' },
      left_toes: { label: '左足趾関節', category: '下肢', x: 32, y: 89, size: 'small' },
      right_toes: { label: '右足趾関節', category: '下肢', x: 15, y: 89, size: 'small' },
    };

    // 背面（右側の人体図）の関節位置
    this.backJointAreas = {
      // 頭部・頸部（背面）
      neck_back: { label: '頸椎（後面）', category: '体幹', x: 77, y: 12, size: 'small' },
      
      // 上肢（背面から見た左右は前面と逆になる + 50%オフセット）
      left_shoulder_back: { label: '左肩関節（後面）', category: '上肢', x: 68, y: 25, size: 'large' },
      right_shoulder_back: { label: '右肩関節（後面）', category: '上肢', x: 87, y: 25, size: 'large' },
      left_elbow_back: { label: '左肘関節（後面）', category: '上肢', x: 65, y: 38, size: 'medium' },
      right_elbow_back: { label: '右肘関節（後面）', category: '上肢', x: 89, y: 38, size: 'medium' },
      left_wrist_back: { label: '左手首（後面）', category: '上肢', x: 57, y: 48, size: 'small' },
      right_wrist_back: { label: '右手首（後面）', category: '上肢', x: 95, y: 48, size: 'small' },
      left_fingers_back: { label: '左指関節（後面）', category: '上肢', x: 55, y: 53, size: 'small' },
      right_fingers_back: { label: '右指関節（後面）', category: '上肢', x: 99, y: 53, size: 'small' },

      // 体幹（背面）
      upper_spine: { label: '胸椎', category: '体幹', x: 77, y: 32, size: 'medium' },
      lower_spine: { label: '腰椎', category: '体幹', x: 77, y: 43, size: 'medium' },
      sacrum: { label: '仙骨', category: '体幹', x: 77, y: 55, size: 'medium' },
      
      // 下肢（背面から見た左右は前面と逆になる + 50%オフセット）
      left_hip_back: { label: '左股関節（後面）', category: '下肢', x: 71, y: 58, size: 'large' },
      right_hip_back: { label: '右股関節（後面）', category: '下肢', x: 83, y: 58, size: 'large' },
      left_knee_back: { label: '左膝関節（後面）', category: '下肢', x: 71, y: 68, size: 'medium' },
      right_knee_back: { label: '右膝関節（後面）', category: '下肢', x: 83, y: 68, size: 'medium' },
      left_ankle_back: { label: '左足首（後面）', category: '下肢', x: 70, y: 82, size: 'small' },
      right_ankle_back: { label: '右足首（後面）', category: '下肢', x: 84, y: 82, size: 'small' },
      left_toes_back: { label: '左足趾関節（後面）', category: '下肢', x: 68, y: 89, size: 'small' },
      right_toes_back: { label: '右足趾関節（後面）', category: '下肢', x: 85, y: 89, size: 'small' },
    };

    // 統合された関節エリア（後方互換性のため）
    this.jointAreas = {
      ...this.frontJointAreas,
      ...this.backJointAreas,
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

  // 症状の色取得（3段階評価対応：軽度・中度・重度）
  getSymptomColor(symptom, level) {
    // 1: 軽度（黄）, 2: 中度（オレンジ）, 3: 重度（赤）、0または未定義: なし（グレー）
    const colors = {
      1: '#FFC107', // 軽度 - 黄色
      2: '#FF8C00', // 中度 - ダークオレンジ  
      3: '#F44336'  // 重度 - 赤
    };
    return colors[level] || 'rgba(224, 224, 224, 0.8)'; // なし - 薄いグレー
  }

  // 関節の表示サイズ取得（3段階評価対応：軽度・中度・重度）
  getJointDisplaySize(joint, level) {
    const baseSize = this.jointAreas[joint]?.size || 'medium';
    const sizeMap = {
      small: { base: 10, sizes: { 0: 10, 1: 12, 2: 15, 3: 18 } },    // 小さい関節
      medium: { base: 14, sizes: { 0: 14, 1: 16, 2: 20, 3: 24 } },   // 中程度の関節  
      large: { base: 18, sizes: { 0: 18, 1: 20, 2: 25, 3: 30 } }     // 大きい関節
    };
    
    const config = sizeMap[baseSize];
    return config.sizes[level] || config.base; // 0または未定義の場合はベースサイズ
  }
}

export default new DetailedHealthService();
