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
import { formatDate, formatDateJapanese } from '../utils/dateUtils';
import DatabaseService from '../services/DatabaseService';

const LabInputField = ({ label, value, onChangeText, unit, placeholder, keyboardType = 'numeric' }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        returnKeyType="next"
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  </View>
);

const ReferenceRangeInfo = ({ title, normal, elevated, description }) => (
  <View style={styles.referenceContainer}>
    <Text style={styles.referenceTitle}>{title}</Text>
    <View style={styles.referenceRow}>
      <Text style={styles.referenceLabel}>正常値:</Text>
      <Text style={styles.referenceValue}>{normal}</Text>
    </View>
    {elevated && (
      <View style={styles.referenceRow}>
        <Text style={styles.referenceLabel}>高値:</Text>
        <Text style={[styles.referenceValue, { color: colors.warning }]}>{elevated}</Text>
      </View>
    )}
    <Text style={styles.referenceDescription}>{description}</Text>
  </View>
);

const LabValuesScreen = ({ navigation }) => {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [crpValue, setCrpValue] = useState('');
  const [esrValue, setEsrValue] = useState('');
  const [mmp3Value, setMmp3Value] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const validateInput = () => {
    if (!crpValue && !esrValue && !mmp3Value) {
      Alert.alert('エラー', '少なくとも1つの検査値を入力してください');
      return false;
    }
    
    // 数値の妥当性チェック
    if (crpValue && (isNaN(parseFloat(crpValue)) || parseFloat(crpValue) < 0)) {
      Alert.alert('エラー', 'CRP値は0以上の数値を入力してください');
      return false;
    }
    
    if (esrValue && (isNaN(parseFloat(esrValue)) || parseFloat(esrValue) < 0)) {
      Alert.alert('エラー', 'ESR値は0以上の数値を入力してください');
      return false;
    }
    
    if (mmp3Value && (isNaN(parseFloat(mmp3Value)) || parseFloat(mmp3Value) < 0)) {
      Alert.alert('エラー', 'MMP-3値は0以上の数値を入力してください');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateInput()) {
      return;
    }

    setIsLoading(true);
    try {
      const crp = crpValue ? parseFloat(crpValue) : null;
      const esr = esrValue ? parseFloat(esrValue) : null;
      const mmp3 = mmp3Value ? parseFloat(mmp3Value) : null;

      await DatabaseService.addLabValue(
        formatDate(date),
        crp,
        esr,
        mmp3,
        notes
      );

      Alert.alert('完了', '検査値を記録しました', [
        {
          text: 'OK',
          onPress: () => {
            // フィールドをクリア
            setCrpValue('');
            setEsrValue('');
            setMmp3Value('');
            setNotes('');
            setDate(new Date());
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
      console.error('Save lab values error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getValueStatus = (value, normalRange, highRange) => {
    if (!value) return null;
    const numValue = parseFloat(value);
    if (numValue <= normalRange) return 'normal';
    if (numValue <= highRange) return 'elevated';
    return 'high';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return colors.success;
      case 'elevated': return colors.warning;
      case 'high': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  const crpStatus = getValueStatus(crpValue, 0.3, 1.0);
  const esrStatus = getValueStatus(esrValue, 20, 40);

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
        <Text style={styles.headerTitle}>検査値入力</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={commonStyles.card}>
          <Text style={commonStyles.title}>検査値記録</Text>
          
          {/* 日付選択 */}
          <View style={styles.dateContainer}>
            <Text style={styles.inputLabel}>検査日</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDateJapanese(date)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* CRP入力 */}
          <LabInputField
            label="CRP（C反応性蛋白）"
            value={crpValue}
            onChangeText={setCrpValue}
            unit="mg/dL"
            placeholder="例: 0.5"
          />
          {crpStatus && (
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(crpStatus) }]}>
              <Text style={styles.statusText}>
                {crpStatus === 'normal' ? '正常範囲' : 
                 crpStatus === 'elevated' ? '軽度上昇' : '高値'}
              </Text>
            </View>
          )}

          {/* ESR入力 */}
          <LabInputField
            label="ESR（赤血球沈降速度）"
            value={esrValue}
            onChangeText={setEsrValue}
            unit="mm/h"
            placeholder="例: 15"
          />
          {esrStatus && (
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(esrStatus) }]}>
              <Text style={styles.statusText}>
                {esrStatus === 'normal' ? '正常範囲' : 
                 esrStatus === 'elevated' ? '軽度上昇' : '高値'}
              </Text>
            </View>
          )}

          {/* MMP-3入力 */}
          <LabInputField
            label="MMP-3（マトリックスメタロプロテアーゼ-3）"
            value={mmp3Value}
            onChangeText={setMmp3Value}
            unit="ng/mL"
            placeholder="例: 45.0"
          />

          {/* メモ */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>メモ（任意）</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="検査結果についてのメモ"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

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
                name="save-outline" 
                size={20} 
                color={colors.textLight} 
                style={{ marginRight: spacing.xs }}
              />
              <Text style={commonStyles.buttonText}>
                {isLoading ? '保存中...' : '保存'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 参考値情報 */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>参考値情報</Text>
          
          <ReferenceRangeInfo
            title="CRP (C反応性蛋白)"
            normal="< 0.3 mg/dL"
            elevated="> 1.0 mg/dL"
            description="体内の炎症反応を示す指標。リウマチの活動性評価に使用。"
          />
          
          <ReferenceRangeInfo
            title="ESR (赤血球沈降速度)"
            normal="< 20 mm/h"
            elevated="> 40 mm/h"
            description="炎症の程度を反映する検査。年齢や性別により基準値が異なります。"
          />
          
          <ReferenceRangeInfo
            title="MMP-3"
            normal="< 121 ng/mL (男性), < 59.7 ng/mL (女性)"
            description="関節破壊の進行を予測する指標。関節リウマチの診断・治療効果判定に有用。"
          />
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
  
  dateContainer: {
    marginBottom: spacing.lg,
  },
  
  dateButton: {
    ...commonStyles.row,
    ...commonStyles.spaceBetween,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  
  dateText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
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
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  input: {
    ...commonStyles.input,
    flex: 1,
    marginRight: spacing.sm,
  },
  
  unit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 60,
  },
  
  notesInput: {
    ...commonStyles.input,
    height: 80,
    paddingTop: spacing.sm,
  },
  
  statusIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  
  statusText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontWeight: '600',
  },
  
  referenceContainer: {
    backgroundColor: colors.lightGray,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  
  referenceTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  
  referenceRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  
  referenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    minWidth: 60,
  },
  
  referenceValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  
  referenceDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  
  buttonDisabled: {
    backgroundColor: colors.gray,
    opacity: 0.6,
  },
});

export default LabValuesScreen;
