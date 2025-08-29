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
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import DatabaseService from '../services/DatabaseService';

const MedicationListScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [])
  );

  const loadMedications = async () => {
    try {
      setRefreshing(true);
      const meds = await DatabaseService.getMedications();
      setMedications(meds);
      console.log('Loaded medications:', meds);
    } catch (error) {
      console.error('Error loading medications:', error);
      Alert.alert('エラー', '薬剤一覧の読み込みに失敗しました');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadMedications();
  };

  const toggleMedicationActive = async (medicationId, currentActive) => {
    try {
      await DatabaseService.updateMedicationActive(medicationId, !currentActive);
      loadMedications();
    } catch (error) {
      console.error('Error updating medication:', error);
      Alert.alert('エラー', '薬剤の更新に失敗しました');
    }
  };

  const deleteMedication = async (medicationId, medicationName) => {
    Alert.alert(
      '確認',
      `「${medicationName}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteMedication(medicationId);
              loadMedications();
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('エラー', '薬剤の削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const getFrequencyText = (frequency) => {
    const frequencies = {
      daily: '毎日',
      weekly: '週単位',
      asNeeded: '頓服'
    };
    return frequencies[frequency] || frequency;
  };

  const renderMedicationItem = ({ item }) => (
    <View style={[styles.medicationItem, !item.active && styles.medicationItemInactive]}>
      <View style={styles.medicationInfo}>
        <Text style={[styles.medicationName, !item.active && styles.inactiveText]}>
          {item.name}
        </Text>
        <Text style={[styles.medicationDosage, !item.active && styles.inactiveText]}>
          {item.dosage} - {getFrequencyText(item.frequency)}
        </Text>
        {item.times && item.times.length > 0 && (
          <Text style={[styles.medicationTimes, !item.active && styles.inactiveText]}>
            服薬時刻: {item.times.join(', ')}
          </Text>
        )}
      </View>
      
      <View style={styles.medicationActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: item.active ? colors.warning : colors.success }
          ]}
          onPress={() => toggleMedicationActive(item.id, item.active)}
        >
          <Ionicons
            name={item.active ? 'pause' : 'play'}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.danger }]}
          onPress={() => deleteMedication(item.id, item.name)}
        >
          <Ionicons name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="medical-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>薬剤が登録されていません</Text>
      <Text style={styles.emptySubtitle}>
        「薬剤を追加」ボタンから新しい薬剤を登録してください
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddMedication')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>薬剤を追加</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => {
    if (medications.length === 0) return null;

    const activeMeds = medications.filter(med => med.active).length;
    const inactiveMeds = medications.filter(med => !med.active).length;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{medications.length}</Text>
          <Text style={styles.statLabel}>合計</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {activeMeds}
          </Text>
          <Text style={styles.statLabel}>有効</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {inactiveMeds}
          </Text>
          <Text style={styles.statLabel}>無効</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>薬剤一覧</Text>
        <TouchableOpacity 
          style={styles.addHeaderButton}
          onPress={() => navigation.navigate('AddMedication')}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {renderStats()}
      
      <FlatList
        data={medications}
        renderItem={renderMedicationItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  addHeaderButton: {
    padding: 8,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  // List
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  medicationItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  medicationItemInactive: {
    backgroundColor: '#f8f8f8',
    opacity: 0.7,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  medicationTimes: {
    fontSize: 12,
    color: '#888',
  },
  inactiveText: {
    color: '#999',
  },
  medicationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.primary,
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
});

export default MedicationListScreen;
