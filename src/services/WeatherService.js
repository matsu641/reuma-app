import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WeatherService {
  constructor() {
    // Open-Meteo API
    this.baseUrl = 'https://api.open-meteo.com/v1';
    this.pressureHistory = [];
    this.pressureThreshold = -3; // 3hPa以上の急降下でアラート
  }

  // 位置情報の許可を取得
  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  // 現在位置を取得
  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('位置情報の許可が必要です');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Get location error:', error);
      // 位置情報が取得できない場合は東京の座標をデフォルトで使用
      return {
        latitude: 35.6762,
        longitude: 139.6503,
      };
    }
  }

  // 現在の天気情報を取得
  async getCurrentWeather() {
    try {
      console.log('🌤️ Starting weather API call with Open-Meteo...');
      const location = await this.getCurrentLocation();
      console.log('📍 Location obtained:', location);
      
      const url = `${this.baseUrl}/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m&hourly=surface_pressure&timezone=auto`;
      console.log('🌐 API URL:', url);
      
      const response = await axios.get(url);
      console.log('✅ Weather API response received:', response.status);

      const data = response.data;
      
      // Open-Meteoの天気コードを説明文に変換
      const weatherDescription = this.getWeatherDescription(data.current.weather_code);
      const weatherIcon = this.getWeatherIconFromCode(data.current.weather_code);
      
      return {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.temperature_2m), // Open-Meteoでは体感温度は別API
        humidity: data.current.relative_humidity_2m,
        pressure: data.current.surface_pressure, // hPa
        description: weatherDescription,
        icon: weatherIcon,
        windSpeed: data.current.wind_speed_10m,
        location: await this.getLocationName(location.latitude, location.longitude),
        country: 'JP',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Weather API error:', error);
      console.error('📊 Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      
      // エラー時はダミーデータを返す（デモ用）
      return {
        temperature: 22,
        feelsLike: 24,
        humidity: 65,
        pressure: 1013,
        description: '晴れ',
        icon: '01d',
        windSpeed: 2.5,
        location: '東京',
        country: 'JP',
        timestamp: new Date(),
        error: 'APIエラー - ダミーデータを表示',
      };
    }
  }

  // 気圧の履歴を保存
  async savePressureHistory(pressure) {
    try {
      const history = await this.getPressureHistory();
      const newEntry = {
        pressure,
        timestamp: new Date().toISOString(),
      };

      // 最新の24時間分のデータのみ保持
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(
        entry => new Date(entry.timestamp) > twentyFourHoursAgo
      );

      filteredHistory.push(newEntry);
      
      await AsyncStorage.setItem('pressure_history', JSON.stringify(filteredHistory));
      this.pressureHistory = filteredHistory;
    } catch (error) {
      console.error('Save pressure history error:', error);
    }
  }

  // 気圧の履歴を取得
  async getPressureHistory() {
    try {
      const history = await AsyncStorage.getItem('pressure_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Get pressure history error:', error);
      return [];
    }
  }

  // 気圧の急変をチェック（重複通知防止機能付き）
  async checkPressureAlert(currentPressure) {
    try {
      const history = await this.getPressureHistory();
      
      if (history.length < 2) {
        return null;
      }

      // 過去3時間以内の最高気圧と比較
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const recentHistory = history.filter(
        entry => new Date(entry.timestamp) > threeHoursAgo
      );

      if (recentHistory.length > 0) {
        const maxPressure = Math.max(...recentHistory.map(entry => entry.pressure));
        const totalChange = currentPressure - maxPressure;

        if (totalChange <= this.pressureThreshold) {
          // 最後に通知した気圧変化を取得
          const lastNotifiedAlert = await this.getLastNotifiedAlert();
          
          // 同じような気圧変化で既に通知済みかチェック
          if (await this.shouldSkipDuplicateAlert(totalChange, lastNotifiedAlert)) {
            console.log('🔕 Skipping duplicate pressure alert');
            return null;
          }

          const alert = {
            type: 'pressure_drop',
            change: totalChange,
            message: `気圧が${Math.abs(totalChange).toFixed(1)}hPa急降下しています。症状の変化にご注意ください。`,
            severity: totalChange <= -5 ? 'high' : 'medium',
            timestamp: new Date().toISOString(),
            pressure: currentPressure,
          };

          // 通知記録を保存
          await this.saveLastNotifiedAlert(alert);
          
          return alert;
        }
      }

      return null;
    } catch (error) {
      console.error('Check pressure alert error:', error);
      return null;
    }
  }

  // 最後に通知したアラートを取得
  async getLastNotifiedAlert() {
    try {
      const lastAlert = await AsyncStorage.getItem('last_notified_alert');
      return lastAlert ? JSON.parse(lastAlert) : null;
    } catch (error) {
      console.error('Get last notified alert error:', error);
      return null;
    }
  }

  // 最後に通知したアラートを保存
  async saveLastNotifiedAlert(alert) {
    try {
      await AsyncStorage.setItem('last_notified_alert', JSON.stringify(alert));
    } catch (error) {
      console.error('Save last notified alert error:', error);
    }
  }

  // 重複アラートをスキップすべきかチェック
  async shouldSkipDuplicateAlert(currentChange, lastNotifiedAlert) {
    if (!lastNotifiedAlert) return false;

    const now = new Date();
    const lastNotifiedTime = new Date(lastNotifiedAlert.timestamp);
    const timeDiff = now - lastNotifiedTime;

    // 1時間以内の場合
    if (timeDiff < 60 * 60 * 1000) {
      // 同じような気圧変化（±1hPa以内）の場合はスキップ
      const changeDiff = Math.abs(currentChange - lastNotifiedAlert.change);
      if (changeDiff <= 1.0) {
        return true;
      }
    }

    // 30分以内の場合は、より厳格にチェック
    if (timeDiff < 30 * 60 * 1000) {
      const changeDiff = Math.abs(currentChange - lastNotifiedAlert.change);
      if (changeDiff <= 2.0) {
        return true;
      }
    }

    return false;
  }

  // アラート履歴をクリア（設定画面から呼び出し用）
  async clearAlertHistory() {
    try {
      await AsyncStorage.removeItem('last_notified_alert');
      console.log('Alert history cleared');
    } catch (error) {
      console.error('Clear alert history error:', error);
    }
  }

  // Open-Meteoの天気コードを日本語説明文に変換
  getWeatherDescription(weatherCode) {
    const descriptions = {
      0: '晴天',
      1: '概ね晴れ',
      2: '部分的に曇り',
      3: '曇り',
      45: '霧',
      48: '着氷性の霧',
      51: '小雨',
      53: '雨',
      55: '大雨',
      56: '着氷性の小雨',
      57: '着氷性の雨',
      61: '弱い雨',
      63: '雨',
      65: '強い雨',
      66: '着氷性の弱い雨',
      67: '着氷性の強い雨',
      71: '弱い雪',
      73: '雪',
      75: '大雪',
      77: 'みぞれ',
      80: '弱いにわか雨',
      81: 'にわか雨',
      82: '激しいにわか雨',
      85: '弱いにわか雪',
      86: '激しいにわか雪',
      95: '雷雨',
      96: '雹を伴う雷雨',
      99: '大粒の雹を伴う雷雨'
    };
    
    return descriptions[weatherCode] || '不明';
  }

  // Open-Meteoの天気コードからアイコンを取得
  getWeatherIconFromCode(weatherCode) {
    if (weatherCode === 0) return '☀️';
    if (weatherCode <= 2) return '🌤️';
    if (weatherCode === 3) return '☁️';
    if (weatherCode >= 45 && weatherCode <= 48) return '🌫️';
    if (weatherCode >= 51 && weatherCode <= 67) return '🌧️';
    if (weatherCode >= 71 && weatherCode <= 77) return '🌨️';
    if (weatherCode >= 80 && weatherCode <= 86) return '🌦️';
    if (weatherCode >= 95) return '⛈️';
    return '🌤️';
  }

  // 位置情報から地名を取得（Open-Meteo Geocoding API使用）
  async getLocationName(lat, lon) {
    try {
      // OpenStreetMap Nominatim APIを使用（無料の逆ジオコーディング）
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=ja`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'RheumaApp/1.0'
        }
      });
      
      if (response.data && response.data.address) {
        const address = response.data.address;
        const parts = [];
        
        // 市区町村
        if (address.city) {
          parts.push(address.city);
        } else if (address.town) {
          parts.push(address.town);
        } else if (address.village) {
          parts.push(address.village);
        }
        
        // 都道府県
        if (address.state) {
          parts.push(address.state);
        }
        
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    } catch (error) {
      console.log('Geocoding API error, using fallback:', error.message);
    }
    
    // APIが失敗した場合のフォールバック（簡易判定）
    return this.getLocationNameFallback(lat, lon);
  }

  // フォールバック用の簡易地名判定
  getLocationNameFallback(lat, lon) {
    // より詳細な主要都市・地域の座標範囲で判定
    const locations = [
      // 北海道
      { name: '札幌市, 北海道', lat: [43.0, 43.2], lon: [141.2, 141.5] },
      { name: '函館市, 北海道', lat: [41.7, 41.8], lon: [140.7, 140.8] },
      
      // 東北
      { name: '仙台市, 宮城県', lat: [38.2, 38.3], lon: [140.8, 141.0] },
      
      // 関東
      { name: '東京都', lat: [35.6, 35.8], lon: [139.6, 139.8] },
      { name: '横浜市, 神奈川県', lat: [35.4, 35.5], lon: [139.6, 139.7] },
      { name: '千葉市, 千葉県', lat: [35.6, 35.7], lon: [140.0, 140.2] },
      { name: 'さいたま市, 埼玉県', lat: [35.8, 35.9], lon: [139.6, 139.7] },
      { name: '宇都宮市, 栃木県', lat: [36.5, 36.6], lon: [139.8, 140.0] },
      { name: '前橋市, 群馬県', lat: [36.3, 36.4], lon: [139.0, 139.2] },
      { name: '水戸市, 茨城県', lat: [36.3, 36.4], lon: [140.4, 140.5] },
      
      // 中部
      { name: '名古屋市, 愛知県', lat: [35.1, 35.2], lon: [136.8, 137.0] },
      { name: '静岡市, 静岡県', lat: [34.9, 35.0], lon: [138.3, 138.4] },
      { name: '新潟市, 新潟県', lat: [37.9, 38.0], lon: [139.0, 139.1] },
      
      // 関西
      { name: '大阪市, 大阪府', lat: [34.6, 34.7], lon: [135.4, 135.6] },
      { name: '京都市, 京都府', lat: [35.0, 35.1], lon: [135.7, 135.8] },
      { name: '神戸市, 兵庫県', lat: [34.6, 34.7], lon: [135.1, 135.3] },
      
      // 中国・四国
      { name: '広島市, 広島県', lat: [34.3, 34.4], lon: [132.4, 132.5] },
      { name: '高松市, 香川県', lat: [34.3, 34.4], lon: [134.0, 134.1] },
      
      // 九州
      { name: '福岡市, 福岡県', lat: [33.5, 33.7], lon: [130.3, 130.5] },
      { name: '熊本市, 熊本県', lat: [32.7, 32.8], lon: [130.7, 130.8] },
      { name: '鹿児島市, 鹿児島県', lat: [31.5, 31.6], lon: [130.5, 130.6] },
    ];
    
    for (const location of locations) {
      if (lat >= location.lat[0] && lat <= location.lat[1] && 
          lon >= location.lon[0] && lon <= location.lon[1]) {
        return location.name;
      }
    }
    
    // どの主要都市にも該当しない場合は都道府県レベルで判定
    if (lat >= 35.5 && lat <= 36.0 && lon >= 139.0 && lon <= 140.5) return '東京都周辺';
    if (lat >= 36.0 && lat <= 37.0 && lon >= 139.0 && lon <= 140.5) return '関東北部';
    if (lat >= 34.5 && lat <= 35.0 && lon >= 135.0 && lon <= 136.0) return '関西地方';
    if (lat >= 35.0 && lat <= 35.5 && lon >= 136.5 && lon <= 137.5) return '愛知県周辺';
    if (lat >= 33.0 && lat <= 34.0 && lon >= 130.0 && lon <= 131.0) return '福岡県周辺';
    if (lat >= 43.0 && lat <= 44.0 && lon >= 141.0 && lon <= 142.0) return '北海道';
    
    // 現在の座標（緯度36.43、経度139.05）の場合
    if (lat >= 36.3 && lat <= 36.5 && lon >= 139.0 && lon <= 139.2) return '群馬県';
    
    return '現在地';
  }

  // 天気アイコンのマッピング
  getWeatherIcon(iconCode) {
    return WeatherService.getWeatherIcon(iconCode);
  }

  // 気圧レベルの判定
  getPressureLevel(pressure) {
    return WeatherService.getPressureLevel(pressure);
  }

  // 症状への影響度を予測
  getSymptomImpact(pressure, humidity) {
    return WeatherService.getSymptomImpact(pressure, humidity);
  }

  getImpactMessage(impact, factors) {
    if (impact >= 4) {
      return `症状が悪化しやすい気象条件です。${factors.join('・')}により関節痛やこわばりが増す可能性があります。`;
    }
    if (impact >= 2) {
      return `やや症状に影響しやすい気象条件です。${factors.join('・')}にご注意ください。`;
    }
    return '気象条件は比較的安定しています。';
  }

  // 天気アイコンマッピング（静的メソッド）
  static getWeatherIcon(iconCode) {
    // Open-Meteo天気コード用のアイコンマッピング
    if (!iconCode && iconCode !== 0) return '�️';
    if (iconCode === 0) return '☀️';
    if (iconCode <= 2) return '🌤️';
    if (iconCode === 3) return '☁️';
    if (iconCode >= 45 && iconCode <= 48) return '�️';
    if (iconCode >= 51 && iconCode <= 67) return '🌧️';
    if (iconCode >= 71 && iconCode <= 77) return '🌨️';
    if (iconCode >= 80 && iconCode <= 86) return '�️';
    if (iconCode >= 95) return '⛈️';
    return '🌤️';
  }

  // 気圧レベル判定（静的メソッド）
  static getPressureLevel(pressure) {
    if (pressure >= 1025) return { level: 'very_high', text: '非常に高い', color: '#4CAF50' };
    if (pressure >= 1020) return { level: 'high', text: '高い', color: '#8BC34A' };
    if (pressure >= 1015) return { level: 'normal', text: '普通', color: '#2196F3' };
    if (pressure >= 1010) return { level: 'low', text: '低い', color: '#FF9800' };
    if (pressure >= 1005) return { level: 'very_low', text: '低い', color: '#FF5722' };
    return { level: 'very_low', text: '非常に低い', color: '#F44336' };
  }

  // 症状への影響度を予測（静的メソッド）
  static getSymptomImpact(pressure, humidity) {
    let impact = 0;
    let factors = [];

    // 気圧の影響
    if (pressure < 1010) {
      impact += pressure < 1000 ? 3 : 2;
      factors.push('低気圧');
    }

    // 湿度の影響
    if (humidity > 70) {
      impact += humidity > 80 ? 2 : 1;
      factors.push('高湿度');
    }

    return {
      score: Math.min(impact, 5), // 最大5点
      level: impact >= 4 ? 'high' : impact >= 2 ? 'medium' : 'low',
      factors,
      message: this.getImpactMessage(impact, factors),
    };
  }

  static getImpactMessage(impact, factors) {
    if (impact >= 4) {
      return `症状が悪化しやすい気象条件です。${factors.join('・')}により関節痛やこわばりが増す可能性があります。`;
    }
    if (impact >= 2) {
      return `やや症状に影響しやすい気象条件です。${factors.join('・')}にご注意ください。`;
    }
    return '気象条件は比較的安定しています。';
  }
}

export default new WeatherService();
