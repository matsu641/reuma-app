import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import WeatherService from '../services/WeatherService';
import NotificationService from '../services/NotificationService';

const WeatherCard = ({ weather, onRefresh, isLoading }) => {
  const pressureLevel = WeatherService.getPressureLevel(weather.pressure);
  const symptomImpact = WeatherService.getSymptomImpact(weather.pressure, weather.humidity);
  
  const getGradientColors = () => {
    if (weather.temperature >= 25) return ['#FF6B6B', '#FF8E53'];
    if (weather.temperature >= 15) return ['#4ECDC4', '#44A08D'];
    return ['#667eea', '#764ba2'];
  };

  const getImpactColor = (level) => {
    switch (level) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      default: return colors.success;
    }
  };

  return (
    <View style={styles.weatherCard}>
      <LinearGradient
        colors={getGradientColors()}
        style={styles.weatherGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.weatherHeader}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color={colors.textLight} />
            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
              {weather.location}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textLight} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={colors.textLight} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.weatherMain}>
          <View style={styles.temperatureContainer}>
            <Text style={styles.weatherIcon}>
              {WeatherService.getWeatherIcon(weather.icon)}
            </Text>
            <View>
              <Text style={styles.temperature}>{weather.temperature}°C</Text>
              <Text style={styles.feelsLike}>体感 {weather.feelsLike}°C</Text>
            </View>
          </View>
          <Text style={styles.description}>{weather.description}</Text>
        </View>

        {weather.error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={16} color={colors.textLight} />
            <Text style={styles.errorText}>{weather.error}</Text>
          </View>
        )}
      </LinearGradient>

      {/* 気圧情報 */}
      <View style={styles.pressureSection}>
        <View style={styles.pressureHeader}>
          <Ionicons name="speedometer-outline" size={20} color={pressureLevel.color} />
          <Text style={styles.pressureTitle}>気圧情報</Text>
        </View>
        
        <View style={styles.pressureMain}>
          <View style={styles.pressureValue}>
            <Text style={[styles.pressureNumber, { color: pressureLevel.color }]}>
              {weather.pressure}
            </Text>
            <Text style={styles.pressureUnit}>hPa</Text>
          </View>
          <View style={styles.pressureStatus}>
            <Text style={[styles.pressureLevel, { color: pressureLevel.color }]}>
              {pressureLevel.text}
            </Text>
          </View>
        </View>
      </View>

      {/* 詳細情報 */}
      <View style={styles.detailsSection}>
        <View style={styles.detailItem}>
          <Ionicons name="water-outline" size={16} color={colors.primary} />
          <Text style={styles.detailLabel}>湿度</Text>
          <Text style={styles.detailValue}>{weather.humidity}%</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="leaf-outline" size={16} color={colors.primary} />
          <Text style={styles.detailLabel}>風速</Text>
          <Text style={styles.detailValue}>{weather.windSpeed}m/s</Text>
        </View>
      </View>

      {/* 症状への影響 */}
      <View style={styles.impactSection}>
        <View style={styles.impactHeader}>
          <Ionicons name="medical-outline" size={18} color={getImpactColor(symptomImpact.level)} />
          <Text style={styles.impactTitle}>症状への影響度</Text>
          <View style={[styles.impactBadge, { backgroundColor: getImpactColor(symptomImpact.level) }]}>
            <Text style={styles.impactScore}>{symptomImpact.score}/5</Text>
          </View>
        </View>
        <Text style={styles.impactMessage}>{symptomImpact.message}</Text>
        {symptomImpact.factors.length > 0 && (
          <View style={styles.factorsContainer}>
            {symptomImpact.factors.map((factor, index) => (
              <View key={index} style={styles.factorChip}>
                <Text style={styles.factorText}>{factor}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const PressureAlert = ({ alert, onDismiss }) => {
  if (!alert) return null;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      default: return colors.primary;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return 'warning';
      case 'medium': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  return (
    <View style={[styles.alertContainer, { borderLeftColor: getSeverityColor(alert.severity) }]}>
      <View style={styles.alertHeader}>
        <Ionicons 
          name={getSeverityIcon(alert.severity)} 
          size={20} 
          color={getSeverityColor(alert.severity)} 
        />
        <Text style={[styles.alertTitle, { color: getSeverityColor(alert.severity) }]}>
          気圧変化アラート
        </Text>
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <Text style={styles.alertAdvice}>
        💡 症状記録を行い、必要に応じて医師にご相談ください。
      </Text>
    </View>
  );
};

const WeatherWidget = ({ navigation }) => {
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pressureAlert, setPressureAlert] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadWeatherData();
    
    // 30分ごとに自動更新
    const interval = setInterval(loadWeatherData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWeatherData = async () => {
    try {
      setIsLoading(true);
      const weatherData = await WeatherService.getCurrentWeather();
      setWeather(weatherData);
      setLastUpdate(new Date());

      // 気圧履歴を保存
      await WeatherService.savePressureHistory(weatherData.pressure);
      
      // 気圧アラートをチェック
      const alert = await WeatherService.checkPressureAlert(weatherData.pressure);
      if (alert) {
        console.log('📢 New pressure alert triggered:', alert);
        setPressureAlert(alert);
        
        // プッシュ通知を送信
        await NotificationService.schedulePressureAlert(alert.message);
      } else {
        console.log('🔕 No pressure alert (duplicate or threshold not met)');
      }
    } catch (error) {
      console.error('Weather load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadWeatherData();
  };

  const dismissAlert = () => {
    setPressureAlert(null);
  };

  const navigateToHistory = () => {
    navigation.navigate('PressureHistory');
  };

  if (!weather) {
    return (
      <View style={[commonStyles.card, commonStyles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>天気情報を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pressureAlert && (
        <PressureAlert alert={pressureAlert} onDismiss={dismissAlert} />
      )}
      
      <View style={styles.weatherCardContainer}>
        <WeatherCard 
          weather={weather} 
          onRefresh={handleRefresh} 
          isLoading={isLoading}
        />
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={navigateToHistory}
        >
          <Ionicons name="analytics-outline" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>気圧履歴</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('WeatherSettings')}
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>設定</Text>
        </TouchableOpacity>
      </View>

      {lastUpdate && (
        <Text style={styles.updateTime}>
          最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },

  weatherCardContainer: {
    paddingHorizontal: spacing.md,
  },
  
  weatherCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  
  weatherGradient: {
    padding: spacing.md,
  },
  
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  
  locationText: {
    color: colors.textLight,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    fontWeight: '500',
    flex: 1,
  },
  
  weatherMain: {
    alignItems: 'center',
  },
  
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  weatherIcon: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  
  temperature: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  
  feelsLike: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    opacity: 0.8,
  },
  
  description: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textTransform: 'capitalize',
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  
  errorText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
  
  pressureSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  pressureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  pressureTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  
  pressureMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  pressureValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  
  pressureNumber: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  
  pressureUnit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  
  pressureStatus: {
    alignItems: 'center',
  },
  
  pressureLevel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  
  detailsSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  impactSection: {
    padding: spacing.md,
  },
  
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  impactTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  
  impactBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  
  impactScore: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  
  impactMessage: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  
  factorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  
  factorChip: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  
  factorText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  
  alertContainer: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  alertTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
    flex: 1,
  },
  
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  
  alertAdvice: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  
  actionButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  
  updateTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default WeatherWidget;
