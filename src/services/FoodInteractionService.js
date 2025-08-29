import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

class FoodInteractionService {
  constructor() {
    // リウマチ薬と食品の相互作用データベース
    this.medicationInteractions = {
      // メトトレキサート
      'メトトレキサート': {
        avoid: [
          { food: 'アルコール', reason: '肝毒性のリスク増加', severity: 'high' },
          { food: '生の葉物野菜', reason: '葉酸の働きを阻害する可能性', severity: 'medium' },
          { food: 'グレープフルーツ', reason: '薬物代謝に影響', severity: 'medium' },
        ],
        caution: [
          { food: '葉酸サプリメント', reason: '医師と相談の上摂取', severity: 'low' },
          { food: 'カフェイン', reason: '大量摂取は避ける', severity: 'low' },
        ],
        recommend: [
          { food: '葉酸を含む食品', reason: '適量の摂取で副作用軽減', examples: ['レバー', 'ほうれん草（加熱済み）'] }
        ]
      },
      
      // プレドニゾロン（ステロイド）
      'プレドニゾロン': {
        avoid: [
          { food: 'アルコール', reason: '胃潰瘍リスク増加', severity: 'high' },
          { food: '生魚・生肉', reason: '感染症リスク増加', severity: 'high' },
          { food: '高塩分食品', reason: 'むくみ・血圧上昇', severity: 'medium' },
        ],
        caution: [
          { food: '砂糖・甘いもの', reason: '血糖値上昇注意', severity: 'medium' },
          { food: 'グレープフルーツ', reason: '薬効に影響の可能性', severity: 'low' },
        ],
        recommend: [
          { food: 'カルシウム・ビタミンD', reason: '骨密度低下予防', examples: ['乳製品', '小魚', 'きのこ類'] }
        ]
      },

      // 生物学的製剤
      '生物学的製剤': {
        avoid: [
          { food: '生もの全般', reason: '免疫抑制による感染症リスク', severity: 'high' },
          { food: '生野菜・果物（洗浄不十分）', reason: '細菌感染リスク', severity: 'high' },
          { food: 'アルコール', reason: '免疫機能への影響', severity: 'medium' },
        ],
        caution: [
          { food: '外食', reason: '衛生管理に注意', severity: 'medium' },
          { food: 'サプリメント', reason: '医師と相談必須', severity: 'medium' },
        ],
        recommend: [
          { food: '加熱済み食品', reason: '安全性確保', examples: ['十分に加熱した肉・魚', '温野菜'] }
        ]
      },

      // NSAIDs
      'ロキソニン': {
        avoid: [
          { food: 'アルコール', reason: '胃腸障害リスク増加', severity: 'high' },
          { food: '空腹時服用', reason: '胃粘膜刺激', severity: 'medium' },
        ],
        caution: [
          { food: '辛い食べ物', reason: '胃への刺激', severity: 'medium' },
          { food: 'カフェイン', reason: '相乗効果による刺激', severity: 'low' },
        ],
        recommend: [
          { food: '牛乳・ヨーグルト', reason: '胃粘膜保護', examples: ['服用前の乳製品摂取'] }
        ]
      },

      'セレコキシブ': {
        avoid: [
          { food: 'アルコール', reason: '心血管リスク増加', severity: 'high' },
        ],
        caution: [
          { food: '高脂肪食', reason: '薬物吸収への影響', severity: 'low' },
        ],
        recommend: [
          { food: '食事と一緒に', reason: '胃腸障害軽減', examples: ['食後服用推奨'] }
        ]
      }
    };
  }

  // 現在の服薬情報と食事記録から相互作用をチェック
  async checkFoodInteractions(foodItems) {
    try {
      const medications = await DatabaseService.getActiveMedications();
      const interactions = [];

      for (const medication of medications) {
        const drugInteractions = this.getMedicationInteractions(medication.name);
        
        if (drugInteractions) {
          for (const foodItem of foodItems) {
            const interaction = this.findFoodInteraction(foodItem, drugInteractions);
            if (interaction) {
              interactions.push({
                medication: medication.name,
                food: foodItem,
                ...interaction
              });
            }
          }
        }
      }

      return interactions;
    } catch (error) {
      console.error('Food interaction check error:', error);
      return [];
    }
  }

  // 薬剤名から相互作用データを取得
  getMedicationInteractions(medicationName) {
    // 部分一致で検索
    for (const [key, value] of Object.entries(this.medicationInteractions)) {
      if (medicationName.includes(key) || key.includes(medicationName)) {
        return value;
      }
    }

    // 薬剤分類での検索
    if (medicationName.includes('生物学的') || medicationName.includes('バイオ')) {
      return this.medicationInteractions['生物学的製剤'];
    }
    
    if (medicationName.includes('ステロイド') || medicationName.includes('プレドニ')) {
      return this.medicationInteractions['プレドニゾロン'];
    }

    return null;
  }

  // 特定の食品と薬剤の相互作用を検索
  findFoodInteraction(foodItem, drugInteractions) {
    // 避けるべき食品
    for (const avoid of drugInteractions.avoid || []) {
      if (foodItem.includes(avoid.food) || avoid.food.includes(foodItem)) {
        return {
          type: 'avoid',
          reason: avoid.reason,
          severity: avoid.severity,
          action: '摂取を避けてください'
        };
      }
    }

    // 注意が必要な食品
    for (const caution of drugInteractions.caution || []) {
      if (foodItem.includes(caution.food) || caution.food.includes(foodItem)) {
        return {
          type: 'caution',
          reason: caution.reason,
          severity: caution.severity,
          action: '注意して摂取してください'
        };
      }
    }

    return null;
  }

  // 食事記録を保存
  async saveFoodLog(foodItems, mealTime = 'other') {
    try {
      const timestamp = new Date().toISOString();
      const foodLog = {
        id: Date.now(),
        foods: foodItems,
        mealTime, // breakfast, lunch, dinner, snack, other
        timestamp,
        interactions: await this.checkFoodInteractions(foodItems)
      };

      const existingLogs = await this.getFoodLogs();
      existingLogs.push(foodLog);

      // 過去30日分のみ保持
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const filteredLogs = existingLogs.filter(
        log => new Date(log.timestamp) > thirtyDaysAgo
      );

      await AsyncStorage.setItem('food_logs', JSON.stringify(filteredLogs));
      return foodLog;
    } catch (error) {
      console.error('Save food log error:', error);
      throw error;
    }
  }

  // 食事記録を取得
  async getFoodLogs(days = 7) {
    try {
      const logs = await AsyncStorage.getItem('food_logs');
      const allLogs = logs ? JSON.parse(logs) : [];
      
      if (days > 0) {
        const targetDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return allLogs.filter(log => new Date(log.timestamp) > targetDate);
      }
      
      return allLogs;
    } catch (error) {
      console.error('Get food logs error:', error);
      return [];
    }
  }

  // 今日の食事記録を取得
  async getTodayFoodLogs() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const logs = await this.getFoodLogs(1);
      return logs.filter(log => new Date(log.timestamp) >= today);
    } catch (error) {
      console.error('Get today food logs error:', error);
      return [];
    }
  }

  // 薬剤の推奨食品を取得
  async getRecommendedFoods() {
    try {
      const medications = await DatabaseService.getActiveMedications();
      const recommendations = [];

      for (const medication of medications) {
        const interactions = this.getMedicationInteractions(medication.name);
        if (interactions && interactions.recommend) {
          recommendations.push({
            medication: medication.name,
            recommendations: interactions.recommend
          });
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Get recommended foods error:', error);
      return [];
    }
  }

  // 食事時間の日本語変換
  getMealTimeText(mealTime) {
    const mealTimes = {
      breakfast: '朝食',
      lunch: '昼食',
      dinner: '夕食',
      snack: '間食',
      other: 'その他'
    };
    return mealTimes[mealTime] || 'その他';
  }

  // 重要度による色分け
  getSeverityColor(severity) {
    const colors = {
      high: '#F44336',    // 赤
      medium: '#FF9800',  // オレンジ
      low: '#FFC107'      // 黄色
    };
    return colors[severity] || '#2196F3';
  }

  // 重要度テキスト
  getSeverityText(severity) {
    const texts = {
      high: '高リスク',
      medium: '注意',
      low: '軽微'
    };
    return texts[severity] || '確認';
  }
}

export default new FoodInteractionService();
