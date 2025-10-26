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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors, spacing, fontSize, commonStyles } from '../utils/styles';
import { formatDateJapanese } from '../utils/dateUtils';
import DetailedHealthService from '../services/DetailedHealthService';

const { width, height } = Dimensions.get('window');

const JointMapView = ({ jointSymptoms, onJointPress }) => {
  const bodyWidth = width * 0.9;
  const bodyHeight = bodyWidth * 1.2; // 人体図は縦長なので比率調整

  // 前面・背面のラベル
  const renderBodyLabel = (title, side) => (
    <View style={styles.bodyLabelContainer}>
      <Text style={styles.bodyLabel}>{title}</Text>
    </View>
  );

  // 関節の丸を描画するヘルパー関数
  const renderJointCircles = (jointAreas) => {
    return Object.entries(jointAreas).map(([joint, config]) => {
      const symptoms = jointSymptoms[joint] || {};
      const maxSymptom = Math.max(symptoms.pain || 0, symptoms.swelling || 0, symptoms.stiffness || 0);
      const jointSize = DetailedHealthService.getJointDisplaySize(joint, maxSymptom);
      const jointColor = maxSymptom > 0 ? DetailedHealthService.getSymptomColor('pain', maxSymptom) : 'rgba(224, 224, 224, 0.8)';
      
      return (
        <TouchableOpacity
          key={joint}
          style={[
            styles.jointCircle,
            {
              left: (config.x / 100) * bodyWidth - jointSize / 2,
              top: (config.y / 100) * bodyHeight - jointSize / 2,
              width: jointSize,
              height: jointSize,
              borderRadius: jointSize / 2,
              backgroundColor: jointColor,
            }
          ]}
          onPress={() => onJointPress(joint, config.label)}
          activeOpacity={0.7}
        >
          {maxSymptom > 0 && (
            <Text style={[styles.jointSymptomText, { fontSize: jointSize * 0.3 }]}>
              {maxSymptom}
            </Text>
          )}
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.jointMapContainer}>
      <Text style={styles.sectionTitle}>関節症状マップ</Text>
      <Text style={styles.mapInstructions}>
        関節をタップして症状を記録してください
      </Text>
      
      {/* 前面と背面のラベル */}
      <View style={styles.bodyLabelsRow}>
        <Text style={styles.bodyViewLabel}>前面</Text>
        <Text style={styles.bodyViewLabel}>背面</Text>
      </View>
      
      <View style={[styles.mapContainer, { width: bodyWidth, height: bodyHeight }]}>
        {/* 人体図の背景画像 */}
        <Image
          source={require('../../assets/human-body.png')}
          style={[styles.humanBodyImage, { width: bodyWidth, height: bodyHeight }]}
          resizeMode="contain"
        />
        
        {/* 関節の丸をオーバーレイ */}
        <View style={[styles.jointOverlay, { width: bodyWidth, height: bodyHeight }]}>
          {/* 前面の関節 */}
          {renderJointCircles(DetailedHealthService.frontJointAreas)}
          {/* 背面の関節 */}
          {renderJointCircles(DetailedHealthService.backJointAreas)}
        </View>
      </View>
      
      {/* 凡例 */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>症状レベル</Text>
        <View style={styles.legendItems}>
          {[
            { level: 1, label: '軽度', color: '#FFC107' },
            { level: 2, label: '中度', color: '#FF8C00' },
            { level: 3, label: '重度', color: '#F44336' }
          ].map(({ level, label, color }) => (
            <View key={level} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendCircle, 
                  { backgroundColor: color }
                ]} 
              />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const SymptomScaleInput = ({ title, value, onValueChange, isJointSymptom = false }) => {
  // 関節症状用の表現（デフォルト：なし＝未入力）
  const jointLevels = [
    { value: 1, label: '軽度', color: '#FFC107' },
    { value: 2, label: '中度', color: '#FF8C00' },
    { value: 3, label: '重度', color: colors.danger }
  ];

  // 全身症状用の表現
  const generalLevels = [
    { value: 1, label: '良い', color: colors.success },
    { value: 2, label: '普通', color: colors.warning },
    { value: 3, label: '悪い', color: colors.danger }
  ];

  const levels = isJointSymptom ? jointLevels : generalLevels;

  return (
    <View style={styles.scaleContainer}>
      <Text style={styles.scaleTitle}>{title}</Text>
      <View style={styles.scaleButtons}>
        {levels.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.scaleButton,
              styles.simpleScaleButton,
              value === level.value && styles.scaleButtonActive,
              value === level.value && { backgroundColor: level.color }
            ]}
            onPress={() => onValueChange(level.value)}
          >
            <Text style={[
              styles.scaleButtonText,
              value === level.value && styles.scaleButtonTextActive
            ]}>
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const TipsSection = () => {
  const tips = [
    {
      icon: '📝',
      title: '記録のタイミング',
      content: '毎日同じ時間に記録することで、より正確な変化を把握できます'
    },
    {
      icon: '🎯',
      title: '症状の感じ方',
      content: '昨日と比べて今日はどうか？を意識して記録しましょう'
    },
    {
      icon: '📊',
      title: 'パターンを見つける',
      content: '天気や薬の服用タイミングとの関連性を観察しましょう'
    },
    {
      icon: '💡',
      title: 'メモ活用',
      content: '新しい症状や気づいたことは詳しくメモに残しましょう'
    },
  ];

  return (
    <View style={styles.tipsContainer}>
      <Text style={styles.sectionTitle}>症状記録・体調管理のコツ</Text>
      <View style={styles.tipsContent}>
        {tips.map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipContent}>{tip.content}</Text>
            </View>
          </View>
        ))}
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
            isJointSymptom={true}
          />
          
          <SymptomScaleInput
            title="腫脹"
            value={localSymptoms.swelling || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, swelling: value }))}
            isJointSymptom={true}
          />
          
          <SymptomScaleInput
            title="こわばり"
            value={localSymptoms.stiffness || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, stiffness: value }))}
            isJointSymptom={true}
          />
          
          <SymptomScaleInput
            title="発赤"
            value={localSymptoms.redness || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, redness: value }))}
            isJointSymptom={true}
          />
          
          <SymptomScaleInput
            title="熱感"
            value={localSymptoms.warmth || 0}
            onValueChange={(value) => setLocalSymptoms(prev => ({ ...prev, warmth: value }))}
            isJointSymptom={true}
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
  const [sleep, setSleep] = useState({ quality: 1, morning_stiffness: 1 });
  const [mood, setMood] = useState(1);
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
        setSleep(todayLog.generalSymptoms?.sleep || { quality: 1, morning_stiffness: 1 });
        setMood(todayLog.generalSymptoms?.mood || 1);
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
    const jointPains = Object.values(jointSymptoms)
      .map(s => s.pain || 0)
      .filter(pain => pain > 0); // 0（症状なし）を除外
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
        sleep,
        mood,
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
          title="気分"
          value={mood}
          onValueChange={setMood}
        />
        
        <SymptomScaleInput
          title="睡眠の質"
          value={sleep.quality || 1}
          onValueChange={(value) => setSleep(prev => ({ ...prev, quality: value }))}
        />
        
        <SymptomScaleInput
          title="朝のこわばり"
          value={sleep.morning_stiffness || 1}
          onValueChange={(value) => setSleep(prev => ({ ...prev, morning_stiffness: value }))}
          isJointSymptom={true}
        />
      </View>

      {/* メモ */}
      <View style={commonStyles.card}>
        <Text style={styles.sectionTitle}>メモ（任意）</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="今日の体調について詳しく記録してください"
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

      {/* コツセクション */}
      <View style={commonStyles.card}>
        <TipsSection />
      </View>

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
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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

  simpleScaleButton: {
    width: 80,
    height: 45,
    borderRadius: 22,
    paddingHorizontal: spacing.sm,
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

  // 人体図関連のスタイル
  humanBodyImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  
  jointOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  
  jointCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  jointSymptomText: {
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // 前面・背面ラベル用のスタイル
  bodyLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  
  bodyViewLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  
  bodyLabelContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  bodyLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // コツセクション
  tipsContainer: {
    
  },
  
  tipsContent: {
    marginTop: spacing.sm,
  },
  
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  
  tipIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  
  tipTextContainer: {
    flex: 1,
  },
  
  tipTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  tipContent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default DetailedSymptomScreen;
