import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { MedicationTracker, QuickMedicationLogger } from '../components/MedicationTracker';
import { MedicationAdherenceChart } from '../components/Charts';

const MedicationScreen = ({ navigation }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setIsRefreshing(false);
  };

  const handleMedicationRecorded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>服薬管理</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMedication')}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <MedicationTracker
          key={`tracker-${refreshKey}`}
          onRecorded={handleMedicationRecorded}
          navigation={navigation}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
        
        <View style={commonStyles.card}>
          <QuickMedicationLogger
            key={`logger-${refreshKey}`}
            onRecorded={handleMedicationRecorded}
            navigation={navigation}
          />
        </View>
        
        <View style={commonStyles.card}>
          <MedicationAdherenceChart
            key={`chart-${refreshKey}`}
            period={7}
          />
        </View>
        
        <View style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>服薬のコツ</Text>
          <View style={styles.tipContainer}>
            <Ionicons name="bulb-outline" size={20} color={colors.accent} />
            <Text style={styles.tipText}>
              決まった時間に服薬することで、薬の効果を最大化できます
            </Text>
          </View>
          <View style={styles.tipContainer}>
            <Ionicons name="alarm-outline" size={20} color={colors.accent} />
            <Text style={styles.tipText}>
              アラームを設定して飲み忘れを防ぎましょう
            </Text>
          </View>
          <View style={styles.tipContainer}>
            <Ionicons name="water-outline" size={20} color={colors.accent} />
            <Text style={styles.tipText}>
              十分な水と一緒に服薬してください
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: 50, // ステータスバー + 追加の余白
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  backButton: {
    padding: spacing.xs,
  },
  
  addButton: {
    padding: spacing.xs,
  },
  
  content: {
    flex: 1,
  },
  
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
});

export default MedicationScreen;
