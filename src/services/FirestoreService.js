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
    if (!user) {
      console.error('User not logged in - cannot access Firestore');
      throw new Error('ユーザーがログインしていません');
    }
    return user.uid;
  }

  // ユーザーのサブコレクションへの参照を取得
  getUserCollection(collectionName) {
    const userId = this.getCurrentUserId();
    return collection(this.db, 'users', userId, collectionName);
  }

  // === 症状記録 ===
  async addSymptomLog(date, painScore, morningStiffnessDuration, notes = '') {
    try {
      const symptomsRef = this.getUserCollection('symptomLogs');
      const docRef = await addDoc(symptomsRef, {
        date: date,
        painScore: painScore,
        morningStiffnessDuration: morningStiffnessDuration || 0,
        notes: notes,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Symptom log added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding symptom log:', error);
      throw error;
    }
  }

  async getSymptomLogs(startDate, endDate) {
    try {
      const symptomsRef = this.getUserCollection('symptomLogs');
      // シンプルなクエリ（インデックス不要）
      const querySnapshot = await getDocs(symptomsRef);
      const symptoms = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
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
      
      return symptoms;
    } catch (error) {
      console.error('Error getting symptom logs:', error);
      throw error;
    }
  }

  // === 服薬記録 ===
  async addMedicationLog(date, time, medicationName, dosage, taken, scheduledTime) {
    try {
      const medicationLogsRef = this.getUserCollection('medicationLogs');
      const docRef = await addDoc(medicationLogsRef, {
        date: date,
        time: time,
        medicationName: medicationName,
        dosage: dosage || '',
        taken: taken ? 1 : 0,
        scheduledTime: scheduledTime || time,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Medication log added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding medication log:', error);
      throw error;
    }
  }

  async getMedicationLogs(startDate, endDate) {
    try {
      const medicationLogsRef = this.getUserCollection('medicationLogs');
      // シンプルなクエリ（インデックス不要）
      const querySnapshot = await getDocs(medicationLogsRef);
      const logs = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
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
      
      return logs;
    } catch (error) {
      console.error('Error getting medication logs:', error);
      throw error;
    }
  }

  // === 薬剤管理 ===
  async addMedication(name, dosage, frequency, times) {
    try {
      const medicationsRef = this.getUserCollection('medications');
      const docRef = await addDoc(medicationsRef, {
        name: name,
        dosage: dosage,
        frequency: frequency,
        times: times,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Medication added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }

  async getMedications() {
    try {
      const medicationsRef = this.getUserCollection('medications');
      const q = query(medicationsRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const medications = [];
      
      querySnapshot.forEach((doc) => {
        medications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return medications;
    } catch (error) {
      console.error('Error getting medications:', error);
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
      const labValuesRef = this.getUserCollection('labValues');
      const docRef = await addDoc(labValuesRef, {
        date: date,
        crpValue: crpValue || null,
        esrValue: esrValue || null,
        mmp3Value: mmp3Value || null,
        notes: notes,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Lab value added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding lab value:', error);
      throw error;
    }
  }

  async getLabValues(startDate, endDate) {
    try {
      const labValuesRef = this.getUserCollection('labValues');
      // シンプルなクエリ（インデックス不要）
      const querySnapshot = await getDocs(labValuesRef);
      const labValues = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
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
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
}

export default new FirestoreService();
