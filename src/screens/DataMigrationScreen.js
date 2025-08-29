import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DatabaseService from '../services/DatabaseService';
import FirestoreService from '../services/FirestoreService';
import { formatDate } from '../utils/dateUtils';

export default function DataMigrationScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState({
    symptoms: 0,
    medications: 0,
    medicationLogs: 0,
    labValues: 0
  });

  const [sqliteDataSummary, setSqliteDataSummary] = useState(null);

  useEffect(() => {
    checkSQLiteData();
  }, []);

  // SQLiteのデータ量をチェック
  const checkSQLiteData = async () => {
    try {
      setIsLoading(true);
      
      // 現在の日付から過去1年分のデータを取得
      const endDate = formatDate(new Date());
      const startDate = formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
      
      // SQLiteモードに強制切り替えしてデータを取得
      const originalMode = DatabaseService.shouldUseFirestore();
      DatabaseService.setFirestoreMode(false);
      
      const symptoms = await DatabaseService.getSymptomLogs(startDate, endDate);
      const medications = await DatabaseService.getMedications();
      const medicationLogs = await DatabaseService.getMedicationLogs(startDate, endDate);
      const labValues = await DatabaseService.getLabValues(startDate, endDate);
      
      setSqliteDataSummary({
        symptoms: symptoms.length,
        medications: medications.length,
        medicationLogs: medicationLogs.length,
        labValues: labValues.length
      });
      
      // 元のモードに戻す
      DatabaseService.setFirestoreMode(originalMode);
      
    } catch (error) {
      console.error('Error checking SQLite data:', error);
      Alert.alert('エラー', 'SQLiteデータの確認に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // データ移行の実行
  const performMigration = async () => {
    Alert.alert(
      '데이터 이행 확인',
      'SQLiteのデータをFirestoreに移行します。この処理は取り消すことができません。続行しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '移行する',
          style: 'destructive',
          onPress: () => executeMigration()
        }
      ]
    );
  };

  const executeMigration = async () => {
    try {
      setIsLoading(true);
      setMigrationStatus({
        symptoms: 0,
        medications: 0,
        medicationLogs: 0,
        labValues: 0
      });

      // SQLiteモードに切り替えしてデータを取得
      DatabaseService.setFirestoreMode(false);
      
      const endDate = formatDate(new Date());
      const startDate = formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
      
      const sqliteData = {
        symptoms: await DatabaseService.getSymptomLogs(startDate, endDate),
        medications: await DatabaseService.getMedications(),
        medicationLogs: await DatabaseService.getMedicationLogs(startDate, endDate),
        labValues: await DatabaseService.getLabValues(startDate, endDate)
      };

      // Firestoreモードに切り替え
      DatabaseService.setFirestoreMode(true);
      
      // データ移行の実行
      await FirestoreService.migrateFromSQLite(sqliteData);
      
      setMigrationStatus({
        symptoms: sqliteData.symptoms.length,
        medications: sqliteData.medications.length,
        medicationLogs: sqliteData.medicationLogs.length,
        labValues: sqliteData.labValues.length
      });

      Alert.alert(
        '移行完了',
        'データの移行が正常に完了しました。今後はFirestoreに保存されます。',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
      
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert('移行エラー', 'データの移行に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ionicons name="cloud-upload-outline" size={48} color="#007AFF" />
          <Text style={styles.title}>Firestoreデータ移行</Text>
          <Text style={styles.subtitle}>
            SQLiteからFirestoreにデータを移行します
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>処理中...</Text>
          </View>
        ) : (
          <>
            {sqliteDataSummary && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>移行予定データ</Text>
                
                <View style={styles.dataRow}>
                  <Ionicons name="medical-outline" size={20} color="#FF6B6B" />
                  <Text style={styles.dataLabel}>症状記録</Text>
                  <Text style={styles.dataCount}>{sqliteDataSummary.symptoms}件</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Ionicons name="medical-outline" size={20} color="#4ECDC4" />
                  <Text style={styles.dataLabel}>薬剤</Text>
                  <Text style={styles.dataCount}>{sqliteDataSummary.medications}件</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Ionicons name="time-outline" size={20} color="#45B7D1" />
                  <Text style={styles.dataLabel}>服薬記録</Text>
                  <Text style={styles.dataCount}>{sqliteDataSummary.medicationLogs}件</Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Ionicons name="flask-outline" size={20} color="#96CEB4" />
                  <Text style={styles.dataLabel}>検査値</Text>
                  <Text style={styles.dataCount}>{sqliteDataSummary.labValues}件</Text>
                </View>
              </View>
            )}

            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                  移行後は自動的にFirestoreが使用されます
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="cloud-outline" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                  複数デバイス間でデータが同期されます
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                  データはユーザーごとに安全に分離されます
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.migrateButton}
              onPress={performMigration}
              disabled={!sqliteDataSummary || Object.values(sqliteDataSummary).every(count => count === 0)}
            >
              <Ionicons name="cloud-upload" size={24} color="white" />
              <Text style={styles.migrateButtonText}>データを移行する</Text>
            </TouchableOpacity>

            {Object.values(migrationStatus).some(count => count > 0) && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>移行結果</Text>
                <Text style={styles.statusText}>
                  症状記録: {migrationStatus.symptoms}件移行完了
                </Text>
                <Text style={styles.statusText}>
                  薬剤: {migrationStatus.medications}件移行完了
                </Text>
                <Text style={styles.statusText}>
                  服薬記録: {migrationStatus.medicationLogs}件移行完了
                </Text>
                <Text style={styles.statusText}>
                  検査値: {migrationStatus.labValues}件移行完了
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollView: {
    flex: 1,
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 30
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  dataLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12
  },
  dataCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12
  },
  migrateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  migrateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8
  },
  statusContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 20,
    marginTop: 10
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5a3d',
    marginBottom: 10
  },
  statusText: {
    fontSize: 14,
    color: '#2d5a3d',
    marginBottom: 4
  }
});
