import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FoodInteractionService from '../services/FoodInteractionService';

const FoodLogScreen = ({ navigation }) => {
  const [foodInput, setFoodInput] = useState('');
  const [selectedMealTime, setSelectedMealTime] = useState('other');
  const [foodItems, setFoodItems] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const mealTimes = [
    { key: 'breakfast', label: '朝食', icon: 'sunny-outline' },
    { key: 'lunch', label: '昼食', icon: 'partly-sunny-outline' },
    { key: 'dinner', label: '夕食', icon: 'moon-outline' },
    { key: 'snack', label: '間食', icon: 'cafe-outline' },
    { key: 'other', label: 'その他', icon: 'restaurant-outline' },
  ];

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const recs = await FoodInteractionService.getRecommendedFoods();
      setRecommendations(recs);
    } catch (error) {
      console.error('Load recommendations error:', error);
    }
  };

  const addFoodItem = () => {
    if (foodInput.trim()) {
      const newItems = [...foodItems, foodInput.trim()];
      setFoodItems(newItems);
      setFoodInput('');
      
      // リアルタイムで相互作用チェック
      checkInteractions(newItems);
    }
  };

  const removeFoodItem = (index) => {
    const newItems = foodItems.filter((_, i) => i !== index);
    setFoodItems(newItems);
    checkInteractions(newItems);
  };

  const checkInteractions = async (items) => {
    try {
      const foundInteractions = await FoodInteractionService.checkFoodInteractions(items);
      setInteractions(foundInteractions);
      
      // 高リスクの相互作用がある場合は即座に警告
      const highRiskInteractions = foundInteractions.filter(i => i.severity === 'high');
      if (highRiskInteractions.length > 0) {
        setShowInteractionModal(true);
      }
    } catch (error) {
      console.error('Check interactions error:', error);
    }
  };

  const saveFoodLog = async () => {
    if (foodItems.length === 0) {
      Alert.alert('エラー', '食べ物を追加してください');
      return;
    }

    try {
      const foodLog = await FoodInteractionService.saveFoodLog(foodItems, selectedMealTime);
      
      if (foodLog.interactions.length > 0) {
        Alert.alert(
          '薬物相互作用の確認',
          `${foodLog.interactions.length}件の注意事項があります。詳細を確認しますか？`,
          [
            { text: 'あとで確認', onPress: () => navigation.goBack() },
            { text: '詳細を見る', onPress: () => setShowInteractionModal(true) }
          ]
        );
      } else {
        Alert.alert('成功', '食事記録を保存しました', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('エラー', '食事記録の保存に失敗しました');
    }
  };

  const renderMealTimeSelector = () => (
    <View style={styles.mealTimeContainer}>
      <Text style={styles.sectionTitle}>食事時間</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {mealTimes.map((meal) => (
          <TouchableOpacity
            key={meal.key}
            style={[
              styles.mealTimeButton,
              selectedMealTime === meal.key && styles.mealTimeButtonActive
            ]}
            onPress={() => setSelectedMealTime(meal.key)}
          >
            <Ionicons
              name={meal.icon}
              size={20}
              color={selectedMealTime === meal.key ? '#fff' : '#666'}
            />
            <Text style={[
              styles.mealTimeText,
              selectedMealTime === meal.key && styles.mealTimeTextActive
            ]}>
              {meal.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFoodInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.sectionTitle}>食べ物・飲み物</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={foodInput}
          onChangeText={setFoodInput}
          placeholder="例: サラダ、牛乳、グレープフルーツ"
          onSubmitEditing={addFoodItem}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={addFoodItem}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFoodList = () => (
    <View style={styles.foodListContainer}>
      {foodItems.map((food, index) => (
        <View key={index} style={styles.foodItem}>
          <Text style={styles.foodText}>{food}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFoodItem(index)}
          >
            <Ionicons name="close" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderInteractionPreview = () => {
    if (interactions.length === 0) return null;

    return (
      <View style={styles.interactionPreview}>
        <View style={styles.interactionHeader}>
          <Ionicons name="warning" size={20} color="#FF9800" />
          <Text style={styles.interactionTitle}>
            薬物相互作用: {interactions.length}件
          </Text>
          <TouchableOpacity onPress={() => setShowInteractionModal(true)}>
            <Text style={styles.viewDetailsText}>詳細</Text>
          </TouchableOpacity>
        </View>
        {interactions.slice(0, 2).map((interaction, index) => (
          <View key={index} style={styles.interactionItem}>
            <View style={[
              styles.severityBadge,
              { backgroundColor: FoodInteractionService.getSeverityColor(interaction.severity) }
            ]}>
              <Text style={styles.severityText}>
                {FoodInteractionService.getSeverityText(interaction.severity)}
              </Text>
            </View>
            <Text style={styles.interactionText}>
              {interaction.food} + {interaction.medication}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    if (recommendations.length === 0) return null;

    return (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>推奨食品</Text>
        {recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.medicationName}>{rec.medication}</Text>
            {rec.recommendations.map((r, i) => (
              <View key={i} style={styles.recommendationDetail}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <View style={styles.recommendationText}>
                  <Text style={styles.foodName}>{r.food}</Text>
                  <Text style={styles.reasonText}>{r.reason}</Text>
                  {r.examples && (
                    <Text style={styles.examplesText}>
                      例: {r.examples.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderInteractionModal = () => (
    <Modal
      visible={showInteractionModal}
      animationType="slide"
      onRequestClose={() => setShowInteractionModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>薬物相互作用の詳細</Text>
          <TouchableOpacity onPress={() => setShowInteractionModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {interactions.map((interaction, index) => (
            <View key={index} style={styles.modalInteractionItem}>
              <View style={styles.interactionMainInfo}>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: FoodInteractionService.getSeverityColor(interaction.severity) }
                ]}>
                  <Text style={styles.severityText}>
                    {FoodInteractionService.getSeverityText(interaction.severity)}
                  </Text>
                </View>
                <Text style={styles.interactionFoodMed}>
                  {interaction.food} × {interaction.medication}
                </Text>
              </View>
              
              <Text style={styles.interactionReason}>{interaction.reason}</Text>
              <Text style={styles.interactionAction}>{interaction.action}</Text>
              
              {interaction.severity === 'high' && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={16} color="#F44336" />
                  <Text style={styles.warningText}>
                    この組み合わせは避けることを強く推奨します
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={styles.understandButton}
            onPress={() => setShowInteractionModal(false)}
          >
            <Text style={styles.understandButtonText}>理解しました</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {renderMealTimeSelector()}
        {renderFoodInput()}
        {renderFoodList()}
        {renderInteractionPreview()}
        {renderRecommendations()}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={saveFoodLog}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={styles.saveButtonText}>記録する</Text>
        </TouchableOpacity>
      </View>

      {renderInteractionModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 20,
  },
  
  // Meal Time Selector
  mealTimeContainer: {
    marginBottom: 20,
  },
  mealTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mealTimeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  mealTimeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  mealTimeTextActive: {
    color: '#fff',
  },
  
  // Food Input
  inputContainer: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  // Food List
  foodListContainer: {
    marginBottom: 20,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  foodText: {
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  
  // Interaction Preview
  interactionPreview: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  interactionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginLeft: 8,
  },
  viewDetailsText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  interactionText: {
    fontSize: 14,
    color: '#333',
  },
  
  // Recommendations
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendationItem: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  recommendationDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    marginLeft: 8,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reasonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  examplesText: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  
  // Bottom Buttons
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalInteractionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  interactionMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  interactionFoodMed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  interactionReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  interactionAction: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  warningText: {
    color: '#F44336',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  modalButtons: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  understandButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  understandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FoodLogScreen;
