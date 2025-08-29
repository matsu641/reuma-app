import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatTime } from '../utils/dateUtils';
import DatabaseService from '../services/DatabaseService';
import NotificationService from '../services/NotificationService';

const TimeSelector = ({ selectedTimes, onTimesChange }) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());

  const handleAddTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = formatTime(selectedTime);
      if (!selectedTimes.includes(timeString)) {
        const newTimes = [...selectedTimes, timeString].sort();
        onTimesChange(newTimes);
      }
    }
  };

  const removeTime = (timeToRemove) => {
    const newTimes = selectedTimes.filter(time => time !== timeToRemove);
    onTimesChange(newTimes);
  };

  return (
    <View style={styles.timeSelectorContainer}>
      <View style={styles.timesHeader}>
        <Text style={styles.inputLabel}>服薬時刻</Text>
        <TouchableOpacity 
          style={styles.addTimeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text style={styles.addTimeText}>時刻を追加</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectedTimes}>
        {selectedTimes.map((time, index) => (
          <View key={index} style={styles.timeChip}>
            <Text style={styles.timeChipText}>{time}</Text>
            <TouchableOpacity
              style={styles.removeTimeButton}
              onPress={() => removeTime(time)}
            >
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        {selectedTimes.length === 0 && (
          <Text style={styles.noTimesText}>服薬時刻を追加してください</Text>
        )}
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="default"
          onChange={handleAddTime}
          is24Hour={true}
        />
      )}
    </View>
  );
};

const FrequencySelector = ({ selectedFrequency, onFrequencyChange }) => {
  const frequencies = [
    { value: 'daily', label: '毎日' },
    { value: 'weekly', label: '週1回' },
    { value: 'monthly', label: '月1回' },
    { value: 'as_needed', label: '頓服' }
  ];

  return (
    <View style={styles.frequencyContainer}>
      <Text style={styles.inputLabel}>服薬頻度</Text>
      <View style={styles.frequencyOptions}>
        {frequencies.map((freq) => (
          <TouchableOpacity
            key={freq.value}
            style={[
              styles.frequencyButton,
              selectedFrequency === freq.value && styles.frequencyButtonSelected
            ]}
            onPress={() => onFrequencyChange(freq.value)}
          >
            <Text style={[
              styles.frequencyButtonText,
              selectedFrequency === freq.value && styles.frequencyButtonTextSelected
            ]}>
              {freq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const AddMedicationScreen = ({ navigation }) => {
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const commonMedications = [
    'メトトレキサート',
    'サラゾスルファピリジン',
    'ヒドロキシクロロキン',
    'レフルノミド',
    'プレドニゾロン',
    'ロキソプロフェン',
    'セレコキシブ',
    'エタネルセプト',
    'アダリムマブ',
    'トシリズマブ'
  ];

  const validateInput = () => {
    if (!medicationName.trim()) {
      Alert.alert('エラー', '薬剤名を入力してください');
      return false;
    }
    
    if (!dosage.trim()) {
      Alert.alert('エラー', '用量を入力してください');
      return false;
    }

    if (frequency === 'daily' && selectedTimes.length === 0) {
      Alert.alert('エラー', '毎日服薬の場合は服薬時刻を設定してください');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateInput()) return;

    setIsLoading(true);
    try {
      // データベースに薬剤を追加
      const medicationId = await DatabaseService.addMedication(
        medicationName.trim(),
        dosage.trim(),
        frequency,
        selectedTimes
      );

      // 毎日服薬の場合は通知を設定
      if (frequency === 'daily' && selectedTimes.length > 0) {
        await NotificationService.scheduleMedicationReminder(
          medicationName.trim(),
          selectedTimes
        );
      }

      Alert.alert(
        '完了',
        '薬剤を追加しました',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      Alert.alert('エラー', '薬剤の追加に失敗しました');
      console.error('Add medication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommonMedicationSelect = (name) => {
    setMedicationName(name);
  };

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>薬剤追加</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={commonStyles.card}>
          <Text style={commonStyles.title}>薬剤情報</Text>
          
          {/* 薬剤名入力 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>薬剤名</Text>
            <TextInput
              style={styles.input}
              value={medicationName}
              onChangeText={setMedicationName}
              placeholder="薬剤名を入力"
              returnKeyType="next"
            />
          </View>

          {/* よく使う薬剤 */}
          <View style={styles.commonMedicationsContainer}>
            <Text style={styles.commonMedicationsLabel}>よく使用される薬剤</Text>
            <View style={styles.commonMedications}>
              {commonMedications.map((med, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.commonMedicationChip}
                  onPress={() => handleCommonMedicationSelect(med)}
                >
                  <Text style={styles.commonMedicationText}>{med}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 用量入力 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>用量</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="例: 2錠、5mg、1包"
              returnKeyType="next"
            />
          </View>

          <FrequencySelector
            selectedFrequency={frequency}
            onFrequencyChange={setFrequency}
          />

          {frequency === 'daily' && (
            <TimeSelector
              selectedTimes={selectedTimes}
              onTimesChange={setSelectedTimes}
            />
          )}

          <TouchableOpacity
            style={[
              commonStyles.button,
              isLoading && styles.buttonDisabled
            ]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <Ionicons 
                name="add-circle" 
                size={20} 
                color={colors.textLight} 
                style={{ marginRight: spacing.xs }}
              />
              <Text style={commonStyles.buttonText}>
                {isLoading ? '追加中...' : '薬剤を追加'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 使用上の注意 */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>ご注意</Text>
          <View style={styles.noticeContainer}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <View style={styles.noticeTextContainer}>
              <Text style={styles.noticeText}>
                薬剤の追加・変更は必ず医師の指示に従って行ってください
              </Text>
              <Text style={styles.noticeText}>
                用法・用量を正確に入力してください
              </Text>
              <Text style={styles.noticeText}>
                通知設定により服薬時間にアラームが鳴ります
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  
  content: {
    flex: 1,
  },
  
  inputContainer: {
    marginBottom: spacing.lg,
  },
  
  inputLabel: {
    ...commonStyles.label,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  input: {
    ...commonStyles.input,
  },
  
  commonMedicationsContainer: {
    marginBottom: spacing.lg,
  },
  
  commonMedicationsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  
  commonMedications: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  commonMedicationChip: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  commonMedicationText: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  
  frequencyContainer: {
    marginBottom: spacing.lg,
  },
  
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  frequencyButton: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  frequencyButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  
  frequencyButtonText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  
  frequencyButtonTextSelected: {
    color: colors.textLight,
    fontWeight: 'bold',
  },
  
  timeSelectorContainer: {
    marginBottom: spacing.lg,
  },
  
  timesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  addTimeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  
  selectedTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minHeight: 40,
  },
  
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  
  timeChipText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  
  removeTimeButton: {
    padding: 2,
  },
  
  noTimesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  
  buttonDisabled: {
    backgroundColor: colors.gray,
    opacity: 0.6,
  },
  
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  noticeTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  
  noticeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
});

export default AddMedicationScreen;
