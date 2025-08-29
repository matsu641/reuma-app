import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatDate } from '../utils/dateUtils';
import DatabaseService from '../services/DatabaseService';

const PainScaleSelector = ({ value, onSelect }) => {
  const painDescriptions = [
    '痛みなし',
    'わずかな痛み',
    '軽い痛み',
    '中程度の痛み',
    '強い痛み',
    'とても強い痛み',
    '激しい痛み',
    'とても激しい痛み',
    '耐えがたい痛み',
    '最大の痛み',
    '想像できる最悪の痛み'
  ];

  return (
    <View style={styles.painScaleContainer}>
      <Text style={styles.sectionTitle}>痛みレベル (0-10)</Text>
      <View style={styles.painScale}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.painButton,
              { backgroundColor: colors.painColors[level] || colors.lightGray },
              value === level && styles.painButtonSelected
            ]}
            onPress={() => onSelect(level)}
          >
            <Text style={[
              styles.painButtonText,
              value === level && styles.painButtonTextSelected
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {value !== null && (
        <Text style={styles.painDescription}>
          {painDescriptions[value]}
        </Text>
      )}
    </View>
  );
};

const StiffnessSelector = ({ value, onSelect }) => {
  const stiffnessOptions = [
    { value: 0, label: 'なし' },
    { value: 15, label: '15分' },
    { value: 30, label: '30分' },
    { value: 60, label: '1時間' },
    { value: 120, label: '2時間' },
    { value: 180, label: '3時間' },
    { value: 240, label: '4時間以上' },
  ];

  return (
    <View style={styles.stiffnessContainer}>
      <Text style={styles.sectionTitle}>朝のこわばり時間</Text>
      <View style={styles.stiffnessOptions}>
        {stiffnessOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.stiffnessButton,
              value === option.value && styles.stiffnessButtonSelected
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.stiffnessButtonText,
              value === option.value && styles.stiffnessButtonTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const SymptomRecorder = ({ onRecorded, date = null }) => {
  const [painScore, setPainScore] = useState(null);
  const [stiffnessDuration, setStiffnessDuration] = useState(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentDate = date || formatDate(new Date());

  const handleSave = async () => {
    if (painScore === null) {
      Alert.alert('エラー', '痛みレベルを選択してください');
      return;
    }

    setIsLoading(true);
    try {
      const id = await DatabaseService.addSymptomLog(
        currentDate,
        painScore,
        stiffnessDuration || 0,
        notes
      );

      Alert.alert('完了', '症状を記録しました', [
        {
          text: 'OK',
          onPress: () => {
            if (onRecorded) {
              onRecorded();
            }
            // リセット
            setPainScore(null);
            setStiffnessDuration(null);
            setNotes('');
          }
        }
      ]);
    } catch (error) {
      Alert.alert('エラー', '記録の保存に失敗しました');
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={commonStyles.card}>
        <Text style={commonStyles.title}>症状記録</Text>
        <Text style={styles.dateText}>{currentDate}</Text>
        
        <PainScaleSelector
          value={painScore}
          onSelect={setPainScore}
        />
        
        <StiffnessSelector
          value={stiffnessDuration}
          onSelect={setStiffnessDuration}
        />
        
        <View style={styles.notesContainer}>
          <Text style={styles.sectionTitle}>メモ（任意）</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="その他の症状や気になることを記入"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        
        <TouchableOpacity
          style={[
            commonStyles.button,
            (painScore === null || isLoading) && styles.buttonDisabled
          ]}
          onPress={handleSave}
          disabled={painScore === null || isLoading}
        >
          <View style={[commonStyles.row, { alignItems: 'center' }]}>
            <Ionicons 
              name="checkmark-circle" 
              size={20} 
              color={colors.textLight} 
              style={{ marginRight: spacing.xs }}
            />
            <Text style={commonStyles.buttonText}>
              {isLoading ? '保存中...' : '記録する'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  dateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  painScaleContainer: {
    marginBottom: spacing.lg,
  },
  
  painScale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  painButton: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  painButtonSelected: {
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  painButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  painButtonTextSelected: {
    color: colors.primary,
  },
  
  painDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  
  stiffnessContainer: {
    marginBottom: spacing.lg,
  },
  
  stiffnessOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  stiffnessButton: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '30%',
    alignItems: 'center',
  },
  
  stiffnessButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  
  stiffnessButtonText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  
  stiffnessButtonTextSelected: {
    color: colors.textLight,
    fontWeight: 'bold',
  },
  
  notesContainer: {
    marginBottom: spacing.lg,
  },
  
  notesInput: {
    ...commonStyles.input,
    height: 80,
    paddingTop: spacing.sm,
  },
  
  buttonDisabled: {
    backgroundColor: colors.gray,
    opacity: 0.6,
  },
});

export default SymptomRecorder;
