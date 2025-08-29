import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import FoodInteractionService from '../services/FoodInteractionService';

const FoodHistoryScreen = ({ navigation }) => {
  const [foodLogs, setFoodLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7日間

  const periods = [
    { days: 1, label: '今日' },
    { days: 7, label: '1週間' },
    { days: 30, label: '1ヶ月' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadFoodLogs();
    }, [selectedPeriod])
  );

  const loadFoodLogs = async () => {
    try {
      setRefreshing(true);
      const logs = await FoodInteractionService.getFoodLogs(selectedPeriod);
      // 新しい順にソート
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setFoodLogs(logs);
    } catch (error) {
      console.error('Load food logs error:', error);
      Alert.alert('エラー', '食事履歴の読み込みに失敗しました');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadFoodLogs();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '今日';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getInteractionsSummary = (interactions) => {
    if (interactions.length === 0) return { text: '問題なし', color: '#4CAF50', icon: 'checkmark-circle' };
    
    const highRisk = interactions.filter(i => i.severity === 'high').length;
    const mediumRisk = interactions.filter(i => i.severity === 'medium').length;
    const lowRisk = interactions.filter(i => i.severity === 'low').length;
    
    if (highRisk > 0) {
      return { 
        text: `高リスク ${highRisk}件`, 
        color: '#F44336', 
        icon: 'warning' 
      };
    } else if (mediumRisk > 0) {
      return { 
        text: `注意 ${mediumRisk}件`, 
        color: '#FF9800', 
        icon: 'alert-circle' 
      };
    } else {
      return { 
        text: `軽微 ${lowRisk}件`, 
        color: '#FFC107', 
        icon: 'information-circle' 
      };
    }
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.days}
          style={[
            styles.periodButton,
            selectedPeriod === period.days && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period.days)}
        >
          <Text style={[
            styles.periodText,
            selectedPeriod === period.days && styles.periodTextActive
          ]}>
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFoodLogItem = ({ item }) => {
    const interactionsSummary = getInteractionsSummary(item.interactions);
    
    return (
      <TouchableOpacity
        style={styles.logItem}
        onPress={() => showLogDetails(item)}
      >
        <View style={styles.logHeader}>
          <View style={styles.timeInfo}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
            <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
          </View>
          <View style={styles.mealTimeContainer}>
            <Text style={styles.mealTimeText}>
              {FoodInteractionService.getMealTimeText(item.mealTime)}
            </Text>
          </View>
        </View>
        
        <View style={styles.foodsContainer}>
          <Text style={styles.foodsText} numberOfLines={2}>
            {item.foods.join(', ')}
          </Text>
        </View>
        
        <View style={styles.logFooter}>
          <View style={styles.interactionStatus}>
            <Ionicons
              name={interactionsSummary.icon}
              size={16}
              color={interactionsSummary.color}
            />
            <Text style={[styles.statusText, { color: interactionsSummary.color }]}>
              {interactionsSummary.text}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };

  const showLogDetails = (log) => {
    if (log.interactions.length === 0) {
      Alert.alert(
        '食事記録の詳細',
        `時間: ${FoodInteractionService.getMealTimeText(log.mealTime)}\n食べ物: ${log.foods.join(', ')}\n\n薬物相互作用は検出されませんでした。`,
        [{ text: 'OK' }]
      );
      return;
    }

    const interactionDetails = log.interactions.map(interaction => 
      `• ${interaction.food} × ${interaction.medication}\n  ${interaction.reason}\n  対応: ${interaction.action}`
    ).join('\n\n');

    Alert.alert(
      '薬物相互作用の詳細',
      `時間: ${FoodInteractionService.getMealTimeText(log.mealTime)}\n食べ物: ${log.foods.join(', ')}\n\n${interactionDetails}`,
      [
        { text: 'OK' },
        ...(log.interactions.some(i => i.severity === 'high') ? [
          { text: '医師に相談', onPress: () => showDoctorConsultation() }
        ] : [])
      ]
    );
  };

  const showDoctorConsultation = () => {
    Alert.alert(
      '医師への相談',
      '高リスクの薬物相互作用が検出されました。次回の診察時に医師にご相談することをお勧めします。',
      [{ text: '理解しました' }]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="restaurant-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>食事記録がありません</Text>
      <Text style={styles.emptySubtitle}>
        {selectedPeriod === 1 ? '今日の' : `過去${selectedPeriod}日間の`}食事記録がありません
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('FoodLog')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>食事を記録する</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => {
    if (foodLogs.length === 0) return null;

    const totalInteractions = foodLogs.reduce((sum, log) => sum + log.interactions.length, 0);
    const highRiskCount = foodLogs.reduce((sum, log) => 
      sum + log.interactions.filter(i => i.severity === 'high').length, 0
    );
    const safeLogsCount = foodLogs.filter(log => log.interactions.length === 0).length;
    const safePercentage = Math.round((safeLogsCount / foodLogs.length) * 100);

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>
          {selectedPeriod === 1 ? '今日' : `${selectedPeriod}日間`}の統計
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{foodLogs.length}</Text>
            <Text style={styles.statLabel}>食事記録</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: highRiskCount > 0 ? '#F44336' : '#4CAF50' }]}>
              {totalInteractions}
            </Text>
            <Text style={styles.statLabel}>相互作用</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
              {safePercentage}%
            </Text>
            <Text style={styles.statLabel}>安全</Text>
          </View>
        </View>
        {highRiskCount > 0 && (
          <View style={styles.warningStats}>
            <Ionicons name="warning" size={16} color="#F44336" />
            <Text style={styles.warningText}>
              {highRiskCount}件の高リスク相互作用が検出されています
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderPeriodSelector()}
      {renderStats()}
      
      <FlatList
        data={foodLogs}
        renderItem={renderFoodLogItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('FoodLog')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#fff',
  },
  
  // Stats
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  warningStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  warningText: {
    color: '#F44336',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  
  // List
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  mealTimeContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealTimeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  foodsContainer: {
    marginBottom: 8,
  },
  foodsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Floating Button
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default FoodHistoryScreen;
