import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig.js';
import { formatDate } from '../utils/dateUtils';

class FirestoreService {
  constructor() {
    this.db = db;
    this.auth = auth;
  }

  // ユーザーIDを取得
  getCurrentUserId() {
    const user = this.auth.currentUser;
    if (!user || !user.uid) {
      console.error('User not logged in - cannot access Firestore');
      throw new Error('ユーザーがログインしていません');
    }
    console.log('Current user ID:', user.uid);
    return user.uid;
  }

  // ユーザーのサブコレクションへの参照を取得
  getUserCollection(collectionName) {
    const userId = this.getCurrentUserId();
    console.log(`Accessing collection '${collectionName}' for user: ${userId}`);
    return collection(this.db, 'users', userId, collectionName);
  }

  // === 症状記録 ===
  async addSymptomLog(date, painScore, morningStiffnessDuration, notes = '') {
    try {
      const userId = this.getCurrentUserId();
      const symptomsRef = this.getUserCollection('symptomLogs');
      const docRef = await addDoc(symptomsRef, {
        date: date,
        painScore: painScore,
        morningStiffnessDuration: morningStiffnessDuration || 0,
        notes: notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId // ユーザーIDも明示的に保存
      });
      
      console.log(`Symptom log added with ID: ${docRef.id} for user: ${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding symptom log:', error);
      throw error;
    }
  }

  async getSymptomLogs(startDate, endDate) {
    try {
      const userId = this.getCurrentUserId();
      const symptomsRef = this.getUserCollection('symptomLogs');
      // シンプルなクエリ（インデックス不要）
      const querySnapshot = await getDocs(symptomsRef);
      const symptoms = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // ユーザーIDの整合性チェック（追加のセキュリティ層）
        if (data.userId && data.userId !== userId) {
          console.warn(`Data ownership mismatch detected! Document user: ${data.userId}, Current user: ${userId}`);
          return; // このドキュメントをスキップ
        }
        
        // 日付範囲でフィルタリング（クライアントサイド）
        if (data.date >= startDate && data.date <= endDate) {
          symptoms.push({
            id: doc.id,
            ...data,
            // SQLite互換性のためのフィールド名変換
            pain_score: data.painScore,
            morning_stiffness_duration: data.morningStiffnessDuration
          });
        }
      });
      
      // JavaScript側でソート
      symptoms.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`Retrieved ${symptoms.length} symptom logs for user: ${userId}`);
      return symptoms;
    } catch (error) {
      console.error('Error getting symptom logs:', error);
      throw error;
    }
  }

  // === 服薬記録 ===
  async addMedicationLog(date, time, medicationName, dosage, taken, scheduledTime) {
    try {
      const userId = this.getCurrentUserId();
      const medicationLogsRef = this.getUserCollection('medicationLogs');
      const docRef = await addDoc(medicationLogsRef, {
        date: date,
        time: time,
        medicationName: medicationName,
        dosage: dosage || '',
        taken: taken ? 1 : 0,
        scheduledTime: scheduledTime || time,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId // ユーザーIDも明示的に保存
      });
      
      console.log(`Medication log added with ID: ${docRef.id} for user: ${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding medication log:', error);
      throw error;
    }
  }

  async getMedicationLogs(startDate, endDate) {
    try {
      const userId = this.getCurrentUserId();
      const medicationLogsRef = this.getUserCollection('medicationLogs');
      // シンプルなクエリ（インデックス不要）
      const querySnapshot = await getDocs(medicationLogsRef);
      const logs = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // ユーザーIDの整合性チェック（追加のセキュリティ層）
        if (data.userId && data.userId !== userId) {
          console.warn(`Data ownership mismatch detected! Document user: ${data.userId}, Current user: ${userId}`);
          return; // このドキュメントをスキップ
        }
        
        // 日付範囲でフィルタリング（クライアントサイド）
        if (data.date >= startDate && data.date <= endDate) {
          logs.push({
            id: doc.id,
            ...data,
            // SQLite互換性のためのフィールド名変換
            medication_name: data.medicationName,
            scheduled_time: data.scheduledTime
          });
        }
      });
      
      // JavaScript側でソート
      logs.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateB - dateA;
      });
      
      console.log(`Retrieved ${logs.length} medication logs for user: ${userId}`);
      return logs;
    } catch (error) {
      console.error('Error getting medication logs:', error);
      throw error;
    }
  }

  // === 薬剤管理 ===
  async addMedication(name, dosage, frequency, times) {
    try {
      const userId = this.getCurrentUserId();
      const medicationsRef = this.getUserCollection('medications');
      const docRef = await addDoc(medicationsRef, {
        name: name,
        dosage: dosage,
        frequency: frequency,
        times: times,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId // ユーザーIDも明示的に保存
      });
      
      console.log(`Medication added with ID: ${docRef.id} for user: ${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }

  async getMedications() {
    try {
      const userId = this.getCurrentUserId();
      const medicationsRef = this.getUserCollection('medications');
      const q = query(medicationsRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const medications = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // ユーザーIDの整合性チェック（追加のセキュリティ層）
        if (data.userId && data.userId !== userId) {
          console.warn(`Data ownership mismatch detected! Document user: ${data.userId}, Current user: ${userId}`);
          return; // このドキュメントをスキップ
        }
        
        medications.push({
          id: doc.id,
          ...data
        });
      });
      
      console.log(`Retrieved ${medications.length} medications for user: ${userId}`);
      return medications;
    } catch (error) {
      console.error('Error getting medications:', error);
      throw error;
    }
  }

  async getActiveMedications() {
    try {
      const medications = await this.getMedications();
      const activeMedications = medications.filter(med => med.active);
      console.log(`Retrieved ${activeMedications.length} active medications`);
      return activeMedications;
    } catch (error) {
      console.error('Error getting active medications:', error);
      throw error;
    }
  }

  async updateMedicationActive(medicationId, active) {
    try {
      const userId = this.getCurrentUserId();
      const medicationRef = doc(this.db, 'users', userId, 'medications', medicationId);
      
      await updateDoc(medicationRef, {
        active: active,
        updatedAt: new Date()
      });
      
      console.log('Medication active status updated:', medicationId, active);
    } catch (error) {
      console.error('Error updating medication active status:', error);
      throw error;
    }
  }

  async deleteMedication(medicationId) {
    try {
      const userId = this.getCurrentUserId();
      const medicationRef = doc(this.db, 'users', userId, 'medications', medicationId);
      
      await deleteDoc(medicationRef);
      console.log('Medication deleted:', medicationId);
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }

  // === 検査値 ===
  async addLabValue(date, crpValue, esrValue, mmp3Value, notes = '') {
    try {
      const userId = this.getCurrentUserId();
      const labValuesRef = this.getUserCollection('labValues');
      const docRef = await addDoc(labValuesRef, {
        date: date,
        crpValue: crpValue || null,
        esrValue: esrValue || null,
        mmp3Value: mmp3Value || null,
        notes: notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId // ユーザーIDも明示的に保存
      });
      
      console.log(`Lab value added with ID: ${docRef.id} for user: ${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding lab value:', error);
      throw error;
    }
  }

  async getLabValues(startDate, endDate) {
    try {
      const userId = this.getCurrentUserId();
      const labValuesRef = this.getUserCollection('labValues');
      // シンプルなクエリ（インデックス不要）
      const querySnapshot = await getDocs(labValuesRef);
      const labValues = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // ユーザーIDの整合性チェック（追加のセキュリティ層）
        if (data.userId && data.userId !== userId) {
          console.warn(`Data ownership mismatch detected! Document user: ${data.userId}, Current user: ${userId}`);
          return; // このドキュメントをスキップ
        }
        
        // 日付範囲でフィルタリング（クライアントサイド）
        if (data.date >= startDate && data.date <= endDate) {
          labValues.push({
            id: doc.id,
            ...data,
            // SQLite互換性のためのフィールド名変換
            crp_value: data.crpValue,
            esr_value: data.esrValue,
            mmp3_value: data.mmp3Value
          });
        }
      });
      
      // JavaScript側でソート
      labValues.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`Retrieved ${labValues.length} lab values for user: ${userId}`);
      return labValues;
    } catch (error) {
      console.error('Error getting lab values:', error);
      throw error;
    }
  }

  // === 服薬遵守率 ===
  async getMedicationAdherence(startDate, endDate) {
    try {
      const medicationLogsRef = this.getUserCollection('medicationLogs');
      // シンプルなクエリ（インデックス不要）
      const querySnapshot = await getDocs(medicationLogsRef);
      let totalScheduled = 0;
      let totalTaken = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // 日付範囲でフィルタリング（クライアントサイド）
        if (data.date >= startDate && data.date <= endDate) {
          totalScheduled++;
          if (data.taken === 1) {
            totalTaken++;
          }
        }
      });
      
      const adherence = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;
      
      return {
        adherence: adherence,
        total: totalScheduled,
        taken: totalTaken
      };
    } catch (error) {
      console.error('Error calculating medication adherence:', error);
      throw error;
    }
  }

  // === データ移行用メソッド ===
  async migrateFromSQLite(sqliteData) {
    try {
      console.log('Starting data migration to Firestore...');
      const batch = writeBatch(this.db);
      const userId = this.getCurrentUserId();
      
      // 症状記録の移行
      if (sqliteData.symptoms && sqliteData.symptoms.length > 0) {
        for (const symptom of sqliteData.symptoms) {
          const symptomsRef = collection(this.db, 'users', userId, 'symptomLogs');
          const newDocRef = doc(symptomsRef);
          batch.set(newDocRef, {
            date: symptom.date,
            painScore: symptom.pain_score,
            morningStiffnessDuration: symptom.morning_stiffness_duration || 0,
            notes: symptom.notes || '',
            createdAt: new Date(symptom.created_at || Date.now()),
            updatedAt: new Date()
          });
        }
      }

      // 薬剤の移行
      if (sqliteData.medications && sqliteData.medications.length > 0) {
        for (const medication of sqliteData.medications) {
          const medicationsRef = collection(this.db, 'users', userId, 'medications');
          const newDocRef = doc(medicationsRef);
          batch.set(newDocRef, {
            name: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            times: JSON.parse(medication.times || '[]'),
            active: medication.active === 1,
            createdAt: new Date(medication.created_at || Date.now()),
            updatedAt: new Date()
          });
        }
      }
      
      await batch.commit();
      console.log('Data migration completed successfully');
    } catch (error) {
      console.error('Error during data migration:', error);
      throw error;
    }
  }

  // === ユーザープロファイル ===
  async createUserProfile(userData = {}) {
    try {
      const userId = this.getCurrentUserId();
      const user = this.auth.currentUser;
      
      const userRef = doc(this.db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...userData
        });
        console.log('User profile created');
      }
      
      // 既存データにユーザーIDを追加するマイグレーション実行
      await this.migrateUserData();
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // === データマイグレーション ===
  async migrateUserData() {
    try {
      const userId = this.getCurrentUserId();
      const collections = ['symptomLogs', 'medicationLogs', 'medications', 'labValues', 'foodLogs'];
      
      for (const collectionName of collections) {
        const collectionRef = this.getUserCollection(collectionName);
        const querySnapshot = await getDocs(collectionRef);
        const batch = writeBatch(this.db);
        let updateCount = 0;
        
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          // ユーザーIDがない場合のみ追加
          if (!data.userId) {
            const docRef = doc(this.db, 'users', userId, collectionName, docSnapshot.id);
            batch.update(docRef, { userId: userId });
            updateCount++;
          }
        });
        
        if (updateCount > 0) {
          await batch.commit();
          console.log(`Migration: Added userId to ${updateCount} documents in ${collectionName}`);
        }
      }
    } catch (error) {
      console.error('Error during data migration:', error);
      // マイグレーションエラーは致命的ではないので、ログのみ出力
    }
  }

  // === 食事記録 ===
  async addFoodLog(foods, mealTime, interactions = []) {
    try {
      const userId = this.getCurrentUserId();
      const foodLogsRef = this.getUserCollection('foodLogs');
      const docRef = await addDoc(foodLogsRef, {
        foods: foods,
        mealTime: mealTime,
        interactions: interactions,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId // ユーザーIDも明示的に保存
      });
      
      console.log(`Food log added with ID: ${docRef.id} for user: ${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding food log:', error);
      throw error;
    }
  }

  async getFoodLogs(days = 7) {
    try {
      const userId = this.getCurrentUserId();
      const foodLogsRef = this.getUserCollection('foodLogs');
      const querySnapshot = await getDocs(foodLogsRef);
      const logs = [];
      
      // 指定日数分の日付を計算
      const targetDate = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // ユーザーIDの整合性チェック（追加のセキュリティ層）
        if (data.userId && data.userId !== userId) {
          console.warn(`Data ownership mismatch detected! Document user: ${data.userId}, Current user: ${userId}`);
          return; // このドキュメントをスキップ
        }
        
        const logDate = data.timestamp?.toDate() || new Date(data.timestamp);
        
        // 指定期間内のデータのみ取得
        if (logDate > targetDate) {
          logs.push({
            id: doc.id,
            ...data,
            timestamp: logDate.toISOString()
          });
        }
      });
      
      // 新しい順にソート
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log(`Retrieved ${logs.length} food logs for user: ${userId} (${days} days)`);
      return logs;
    } catch (error) {
      console.error('Error getting food logs:', error);
      throw error;
    }
  }

  async getTodayFoodLogs() {
    try {
      const userId = this.getCurrentUserId();
      const foodLogsRef = this.getUserCollection('foodLogs');
      const querySnapshot = await getDocs(foodLogsRef);
      const logs = [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // ユーザーIDの整合性チェック（追加のセキュリティ層）
        if (data.userId && data.userId !== userId) {
          console.warn(`Data ownership mismatch detected! Document user: ${data.userId}, Current user: ${userId}`);
          return; // このドキュメントをスキップ
        }
        
        const logDate = data.timestamp?.toDate() || new Date(data.timestamp);
        
        // 今日のデータのみ取得
        if (logDate >= today) {
          logs.push({
            id: doc.id,
            ...data,
            timestamp: logDate.toISOString()
          });
        }
      });
      
      // 新しい順にソート
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log(`Retrieved ${logs.length} today's food logs for user: ${userId}`);
      return logs;
    } catch (error) {
      console.error('Error getting today food logs:', error);
      throw error;
    }
  }

  async deleteFoodLog(logId) {
    try {
      const userId = this.getCurrentUserId();
      const foodLogRef = doc(this.db, 'users', userId, 'foodLogs', logId);
      
      await deleteDoc(foodLogRef);
      console.log(`Food log deleted: ${logId} for user: ${userId}`);
    } catch (error) {
      console.error('Error deleting food log:', error);
      throw error;
    }
  }
}

export default new FirestoreService();
