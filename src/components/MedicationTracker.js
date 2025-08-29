import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatDate, formatTime, formatDateJapanese } from '../utils/dateUtils';
import DatabaseService from '../services/DatabaseService';

const MedicationItem = ({ medication, onTaken }) => {
  const [takenTimes, setTakenTimes] = useState(new Set());
  const [loadingTimes, setLoadingTimes] = useState(new Set());

  const currentDate = formatDate(new Date());

  useEffect(() => {
    loadTakenStatus();
  }, []);

  const loadTakenStatus = async () => {
    try {
      const logs = await DatabaseService.getMedicationLogs(currentDate, currentDate);
      const taken = new Set();
      
      logs.forEach(log => {
        if (log.medication_name === medication.name && log.taken === 1) {
          taken.add(log.scheduled_time);
        }
      });
      
      setTakenTimes(taken);
    } catch (error) {
      console.error('Error loading taken status:', error);
    }
  };

  const handleTaken = async (scheduledTime) => {
    const timeKey = scheduledTime;
    setLoadingTimes(prev => new Set(prev).add(timeKey));

    try {
      const currentTime = formatTime(new Date());
      const isTaken = takenTimes.has(timeKey);
      
      await DatabaseService.addMedicationLog(
        currentDate,
        currentTime,
        medication.name,
        medication.dosage,
        isTaken ? 0 : 1,
        scheduledTime
      );

      const newTakenTimes = new Set(takenTimes);
      if (isTaken) {
        newTakenTimes.delete(timeKey);
      } else {
        newTakenTimes.add(timeKey);
      }
      
      setTakenTimes(newTakenTimes);
      
      if (onTaken) {
        onTaken();
      }
    } catch (error) {
      Alert.alert('エラー', '記録の更新に失敗しました');
      console.error('Medication log error:', error);
    } finally {
      setLoadingTimes(prev => {
        const newSet = new Set(prev);
        newSet.delete(timeKey);
        return newSet;
      });
    }
  };

  return (
    <View style={styles.medicationItem}>
      <View style={styles.medicationHeader}>
        <Text style={styles.medicationName}>{medication.name}</Text>
        <Text style={styles.medicationDosage}>{medication.dosage}</Text>
      </View>
      
      <View style={styles.timesContainer}>
        {medication.times.map((time) => {
          const isTaken = takenTimes.has(time);
          const isLoading = loadingTimes.has(time);
          
          return (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeButton,
                isTaken && styles.timeButtonTaken,
                isLoading && styles.timeButtonLoading
              ]}
              onPress={() => handleTaken(time)}
              disabled={isLoading}
            >
              <Text style={[
                styles.timeText,
                isTaken && styles.timeTextTaken
              ]}>
                {time}
              </Text>
              <Ionicons
                name={isTaken ? "checkmark-circle" : "time-outline"}
                size={16}
                color={isTaken ? colors.textLight : colors.textSecondary}
                style={styles.timeIcon}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MedicationTracker = ({ onRecorded, navigation }) => {
  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const meds = await DatabaseService.getMedications();
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMedicationTaken = () => {
    if (onRecorded) {
      onRecorded();
    }
  };

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (medications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={commonStyles.card}>
          <View style={styles.headerWithActions}>
            <Text style={commonStyles.title}>服薬管理</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyState}>
            <Ionicons name="medical" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>
              薬剤が登録されていません
            </Text>
            <Text style={styles.emptySubtext}>
              薬剤を追加して服薬管理を始めましょう
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>薬剤を追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={commonStyles.card}>
        <View style={styles.headerWithActions}>
          <View>
            <Text style={commonStyles.title}>今日の服薬</Text>
            <Text style={styles.dateText}>
              {formatDateJapanese(new Date())}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MedicationList')}
            >
              <Ionicons name="list" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MedicationItem
              medication={item}
              onTaken={handleMedicationTaken}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const QuickMedicationLogger = ({ onRecorded, navigation }) => {
  const [medications, setMedications] = useState([]);
  const [expandedMeds, setExpandedMeds] = useState({});

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const meds = await DatabaseService.getMedications();
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const quickLog = async (medicationName, dosage) => {
    try {
      const currentTime = formatTime(new Date());
      const currentDate = formatDate(new Date());
      
      await DatabaseService.addMedicationLog(
        currentDate,
        currentTime,
        medicationName,
        dosage,
        1,
        currentTime
      );

      Alert.alert('完了', `${medicationName}の服薬を記録しました`);
      
      if (onRecorded) {
        onRecorded();
      }
    } catch (error) {
      Alert.alert('エラー', '記録の保存に失敗しました');
      console.error('Quick log error:', error);
    }
  };

  if (medications.length === 0) {
    return (
      <View style={styles.quickLogContainer}>
        <View style={styles.headerWithActions}>
          <Text style={commonStyles.subtitle}>クイック記録</Text>
          {navigation && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.emptyQuickLog}>
          <Text style={styles.emptyQuickLogText}>
            登録された薬剤がありません
          </Text>
          {navigation && (
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Text style={styles.smallButtonText}>薬剤を追加</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.quickLogContainer}>
      <View style={styles.headerWithActions}>
        <Text style={commonStyles.subtitle}>クイック記録</Text>
        {navigation && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddMedication')}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.quickButtons}>
        {medications.map((med) => (
          <TouchableOpacity
            key={med.id}
            style={styles.quickButton}
            onPress={() => quickLog(med.name, med.dosage)}
          >
            <Ionicons name="medical" size={20} color={colors.primary} />
            <Text style={styles.quickButtonText}>{med.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  headerWithActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  
  actionButton: {
    padding: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.lightGray,
  },
  
  addButton: {
    padding: spacing.xs,
  },
  
  dateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  
  medicationItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  medicationHeader: {
    marginBottom: spacing.sm,
  },
  
  medicationName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  medicationDosage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  timeButtonTaken: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  
  timeButtonLoading: {
    opacity: 0.6,
  },
  
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  
  timeTextTaken: {
    color: colors.textLight,
    fontWeight: 'bold',
  },
  
  timeIcon: {
    marginLeft: spacing.xs,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  
  primaryButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  
  quickLogContainer: {
    marginTop: spacing.lg,
  },
  
  emptyQuickLog: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  
  emptyQuickLogText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  
  smallButton: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  smallButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  quickButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
});

export { MedicationTracker, QuickMedicationLogger };
