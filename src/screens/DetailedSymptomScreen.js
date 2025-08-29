import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatDateJapanese } from '../utils/dateUtils';
import DetailedHealthService from '../services/DetailedHealthService';

const { width, height } = Dimensions.get('window');

const JointMapView = ({ jointSymptoms, onJointPress }) => {
  const bodyWidth = width * 0.8;
  const bodyHeight = height * 0.6;

  return (
    <View style={styles.jointMapContainer}>
      <Text style={styles.sectionTitle}>関節症状マップ</Text>
      <Text style={styles.mapInstructions}>
        関節をタップして症状を記録してください
      </Text>
      
      <View style={styles.mapContainer}>
        <Svg width={bodyWidth} height={bodyHeight} style={styles.bodySvg}>
          {Object.entries(DetailedHealthService.jointAreas).map(([joint, config]) => {
            const symptoms = jointSymptoms[joint] || {};
            const maxSymptom = Math.max(symptoms.pain || 0, symptoms.swelling || 0, symptoms.stiffness || 0);
            const jointSize = DetailedHealthService.getJointDisplaySize(joint, maxSymptom);
            const jointColor = maxSymptom > 0 ? DetailedHealthService.getSymptomColor('pain', maxSymptom) : '#E0E0E0';
            
            return (
              <Circle
                key={joint}
                cx={(config.x / 100) * bodyWidth}
                cy={(config.y / 100) * bodyHeight}
                r={jointSize / 2}
                fill={jointColor}
                stroke="#333"
                strokeWidth={2}
                onPress={() => onJointPress(joint, config.label)}
              />
            );
          })}
        </Svg>
      </View>
      
      {/* 凡例 */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>症状レベル</Text>
        <View style={styles.legendItems}>
          {[1, 2, 3, 4, 5].map(level => (
            <View key={level} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendCircle, 
                  { backgroundColor: DetailedHealthService.getSymptomColor('pain', level) }
                ]} 
              />
              <Text style={styles.legendText}>{level}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const SymptomScaleInput = ({ title, value, onValueChange, maxLevel = 5, color = colors.primary }) => {
  return (
    <View style={styles.scaleContainer}>
      <Text style={styles.scaleTitle}>{title}</Text>
      <View style={styles.scaleButtons}>
        {Array.from({ length: maxLevel + 1 }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.scaleButton,
              value === i && styles.scaleButtonActive,
              value === i && { backgroundColor: color }
            ]}
            onPress={() => onValueChange(i)}
          >
            <Text style={[
              styles.scaleButtonText,
              value === i && styles.scaleButtonTextActive
            ]}>
              {i}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabelText}>なし</Text>
        <Text style={styles.scaleLabelText}>非常に強い</Text>
      </View>
    </View>
  );
};

const JointSymptomModal = ({ visible, joint, jointLabel, symptoms, onSave, onClose }) => {
  const [localSymptoms, setLocalSymptoms] = useState(symptoms || {});

  useEffect(() => {
    setLocalSymptoms(symptoms || {});
  }, [symptoms, visible]);

  const handleSave = () => {
    onSave(joint, localSymptoms);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{jointLabel} の症状</Text>
        
        <ScrollView style={styles.modalContent}>
          <SymptomScaleInput
            title="痛み"
            value={localSymptoms.pain || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, pain: value }))}
            color={colors.error}
          />
          
          <SymptomScaleInput
            title="腫脹"
            value={localSymptoms.swelling || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, swelling: value }))}
            color={colors.info}
          />
          
          <SymptomScaleInput
            title="こわばり"
            value={localSymptoms.stiffness || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, stiffness: value }))}
            color={colors.warning}
          />
          
          <SymptomScaleInput
            title="発赤"
            value={localSymptoms.redness || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, redness: value }))}
            maxLevel={3}
            color="#F9A825"
          />
          
          <SymptomScaleInput
            title="熱感"
            value={localSymptoms.warmth || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, warmth: value }))}
            maxLevel={3}
            color="#E85D75"
          />
        </ScrollView>
        
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}>
            <Text style={styles.modalButtonSecondaryText}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSave}>
            <Text style={styles.modalButtonPrimaryText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const DetailedSymptomScreen = ({ navigation }) => {
  const [jointSymptoms, setJointSymptoms] = useState({});
  const [fatigue, setFatigue] = useState({});
  const [sleep, setSleep] = useState({});
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      const todayLog = await DetailedHealthService.getTodayDetailedLog();
      if (todayLog) {
        setJointSymptoms(todayLog.jointSymptoms || {});
        setFatigue(todayLog.generalSymptoms?.fatigue || {});
        setSleep(todayLog.generalSymptoms?.sleep || {});
        setMood(todayLog.generalSymptoms?.mood || 3);
        setStress(todayLog.generalSymptoms?.stress || 3);
        setNotes(todayLog.notes || '');
      }
    } catch (error) {
      console.error('Load today data error:', error);
    }
  };

  const handleJointPress = (joint, jointLabel) => {
    setSelectedJoint({ joint, jointLabel });
    setModalVisible(true);
  };

  const handleJointSave = (joint, symptoms) => {
    setJointSymptoms(prev => ({
      ...prev,
      [joint]: symptoms
    }));
  };

  const calculateOverallPainScore = () => {
    const jointPains = Object.values(jointSymptoms).map(s => s.pain || 0);
    if (jointPains.length === 0) return 0;
    return Math.round(jointPains.reduce((sum, pain) => sum + pain, 0) / jointPains.length);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const overallPainScore = calculateOverallPainScore();
      
      const data = {
        date: new Date().toISOString().split('T')[0],
        jointSymptoms,
        fatigue,
        sleep,
        mood,
        stress,
        notes,
        overallPainScore,
      };

      await DetailedHealthService.saveDetailedSymptomLog(data);
      
      Alert.alert(
        '保存完了',
        '症状記録を保存しました',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('エラー', '症状記録の保存に失敗しました');
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>詳細症状記録</Text>
          <Text style={styles.headerDate}>{formatDateJapanese(new Date())}</Text>
        </View>
      </View>

      {/* 関節症状マップ */}
      <View style={commonStyles.card}>
        <JointMapView
          jointSymptoms={jointSymptoms}
          onJointPress={handleJointPress}
        />
      </View>

      {/* 全身症状 */}
      <View style={commonStyles.card}>
        <Text style={styles.sectionTitle}>全身症状</Text>
        
        <SymptomScaleInput
          title="身体的疲労"
          value={fatigue.physical || 0}
          onValueChange={(value) => setFatigue(prev => ({ ...prev, physical: value }))}
          color={colors.warning}
        />
        
        <SymptomScaleInput
          title="精神的疲労"
          value={fatigue.mental || 0}
          onValueChange={(value) => setFatigue(prev => ({ ...prev, mental: value }))}
          color={colors.info}
        />
        
        <SymptomScaleInput
          title="気分"
          value={mood}
          onValueChange={setMood}
          color={colors.success}
        />
        
        <SymptomScaleInput
          title="ストレス"
          value={stress}
          onValueChange={setStress}
          color={colors.error}
        />
      </View>

      {/* 睡眠 */}
      <View style={commonStyles.card}>
        <Text style={styles.sectionTitle}>睡眠</Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>睡眠時間</Text>
          <View style={styles.sleepInput}>
            <TextInput
              style={styles.numberInput}
              value={sleep.duration?.toString() || ''}
              onChangeText={(text) => setSleep(prev => ({ ...prev, duration: parseFloat(text) || 0 }))}
              keyboardType="numeric"
              placeholder="8"
            />
            <Text style={styles.inputUnit}>時間</Text>
          </View>
        </View>
        
        <SymptomScaleInput
          title="睡眠の質"
          value={sleep.quality || 0}
          onValueChange={(value) => setSleep(prev => ({ ...prev, quality: value }))}
          color={colors.primary}
        />
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>中途覚醒回数</Text>
          <View style={styles.sleepInput}>
            <TextInput
              style={styles.numberInput}
              value={sleep.interruptions?.toString() || ''}
              onChangeText={(text) => setSleep(prev => ({ ...prev, interruptions: parseInt(text) || 0 }))}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.inputUnit}>回</Text>
          </View>
        </View>
        
        <SymptomScaleInput
          title="朝のこわばり"
          value={sleep.morning_stiffness || 0}
          onValueChange={(value) => setSleep(prev => ({ ...prev, morning_stiffness: value }))}
          color={colors.warning}
        />
      </View>

      {/* メモ */}
      <View style={commonStyles.card}>
        <Text style={styles.sectionTitle}>メモ</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="今日の体調について詳しく記録してください..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>
          {isLoading ? '保存中...' : '症状記録を保存'}
        </Text>
      </TouchableOpacity>

      <JointSymptomModal
        visible={modalVisible}
        joint={selectedJoint?.joint}
        jointLabel={selectedJoint?.jointLabel}
        symptoms={selectedJoint ? jointSymptoms[selectedJoint.joint] : {}}
        onSave={handleJointSave}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 50,
    backgroundColor: colors.primary,
  },
  
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  
  headerTitleText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  headerDate: {
    fontSize: fontSize.md,
    color: '#fff',
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  // 関節マップ
  jointMapContainer: {
    alignItems: 'center',
  },
  
  mapInstructions: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  mapContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  bodySvg: {
    backgroundColor: colors.lightGray,
    borderRadius: 12,
  },
  
  legend: {
    width: '100%',
  },
  
  legendTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  
  legendItem: {
    alignItems: 'center',
  },
  
  legendCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  
  legendText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  
  // スケール入力
  scaleContainer: {
    marginBottom: spacing.lg,
  },
  
  scaleTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  
  scaleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  
  scaleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  scaleButtonActive: {
    borderColor: colors.primary,
  },
  
  scaleButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  scaleButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  
  scaleLabelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  
  // 入力フィールド
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  inputLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  
  sleepInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  numberInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
    width: 60,
    textAlign: 'center',
  },
  
  inputUnit: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
    minHeight: 100,
  },
  
  // 保存ボタン
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl,
    alignItems: 'center',
  },
  
  saveButtonDisabled: {
    opacity: 0.6,
  },
  
  saveButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  
  // モーダル
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.lg,
    maxHeight: '80%',
    minWidth: '80%',
  },
  
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  modalContent: {
    maxHeight: 400,
  },
  
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
  },
  
  modalButtonSecondaryText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  
  modalButtonPrimaryText: {
    fontSize: fontSize.md,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default DetailedSymptomScreen;
