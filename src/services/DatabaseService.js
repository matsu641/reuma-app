import * as SQLite from 'expo-sqlite';
import FirestoreService from './FirestoreService';
import { auth } from '../../firebaseConfig';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.useFirestore = false; // Firestore使用フラグ
  }

  // Firestoreモードの切り替え
  setFirestoreMode(enabled = true) {
    this.useFirestore = enabled;
    console.log(`Database mode switched to: ${enabled ? 'Firestore' : 'SQLite'}`);
  }

  // ユーザーがログインしているかチェック
  isUserLoggedIn() {
    return auth.currentUser !== null;
  }

  // データベースモードの自動判定
  shouldUseFirestore() {
    return this.useFirestore && this.isUserLoggedIn();
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInit();
    return this.initPromise;
  }

  async _performInit() {
    try {
      this.db = await SQLite.openDatabaseAsync('rheuma_app.db');
      await this.createTables();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  async createTables() {
    const createSymptomLogsTable = `
      CREATE TABLE IF NOT EXISTS symptom_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        pain_score INTEGER NOT NULL,
        morning_stiffness_duration INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `;

    const createMedicationLogsTable = `
      CREATE TABLE IF NOT EXISTS medication_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT,
        taken INTEGER DEFAULT 0,
        scheduled_time TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `;

    const createLabValuesTable = `
      CREATE TABLE IF NOT EXISTS lab_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        crp_value REAL,
        esr_value REAL,
        mmp3_value REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
    `;

    const createMedicationsTable = `
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        times TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.execAsync(createSymptomLogsTable);
    await this.db.execAsync(createMedicationLogsTable);
    await this.db.execAsync(createLabValuesTable);
    await this.db.execAsync(createMedicationsTable);
  }

  // 症状記録の追加
  async addSymptomLog(date, painScore, morningStiffnessDuration, notes = '') {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.addSymptomLog(date, painScore, morningStiffnessDuration, notes);
    }
    
    await this.ensureInitialized();
    
    const query = `
      INSERT INTO symptom_logs (date, pain_score, morning_stiffness_duration, notes)
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const result = await this.db.runAsync(query, [date, painScore, morningStiffnessDuration, notes]);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding symptom log:', error);
      throw error;
    }
  }

  // 服薬記録の追加
  async addMedicationLog(date, time, medicationName, dosage, taken, scheduledTime) {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.addMedicationLog(date, time, medicationName, dosage, taken, scheduledTime);
    }
    
    await this.ensureInitialized();
    
    const query = `
      INSERT INTO medication_logs (date, time, medication_name, dosage, taken, scheduled_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await this.db.runAsync(query, [date, time, medicationName, dosage, taken, scheduledTime]);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding medication log:', error);
      throw error;
    }
  }

  // 検査値の追加
  async addLabValue(date, crpValue, esrValue, mmp3Value, notes = '') {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.addLabValue(date, crpValue, esrValue, mmp3Value, notes);
    }
    
    await this.ensureInitialized();
    
    const query = `
      INSERT INTO lab_values (date, crp_value, esr_value, mmp3_value, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await this.db.runAsync(query, [date, crpValue, esrValue, mmp3Value, notes]);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding lab value:', error);
      throw error;
    }
  }

  // 症状記録の取得
  async getSymptomLogs(startDate, endDate) {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.getSymptomLogs(startDate, endDate);
    }
    
    await this.ensureInitialized();
    
    const query = `
      SELECT * FROM symptom_logs
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC
    `;
    
    try {
      const result = await this.db.getAllAsync(query, [startDate, endDate]);
      return result;
    } catch (error) {
      console.error('Error getting symptom logs:', error);
      throw error;
    }
  }

  // 服薬記録の取得
  async getMedicationLogs(startDate, endDate) {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.getMedicationLogs(startDate, endDate);
    }
    
    await this.ensureInitialized();
    
    const query = `
      SELECT * FROM medication_logs
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC, time DESC
    `;
    
    try {
      const result = await this.db.getAllAsync(query, [startDate, endDate]);
      return result;
    } catch (error) {
      console.error('Error getting medication logs:', error);
      throw error;
    }
  }

  // 検査値の取得
  async getLabValues(startDate, endDate) {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.getLabValues(startDate, endDate);
    }
    
    await this.ensureInitialized();
    const query = `
      SELECT * FROM lab_values
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC
    `;
    
    try {
      const result = await this.db.getAllAsync(query, [startDate, endDate]);
      return result;
    } catch (error) {
      console.error('Error getting lab values:', error);
      throw error;
    }
  }

  // 薬剤の追加
  async addMedication(name, dosage, frequency, times) {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.addMedication(name, dosage, frequency, times);
    }
    
    await this.ensureInitialized();
    
    const query = `
      INSERT INTO medications (name, dosage, frequency, times)
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const result = await this.db.runAsync(query, [name, dosage, frequency, JSON.stringify(times)]);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }

  // 薬剤一覧の取得
  async getMedications() {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.getMedications();
    }
    
    await this.ensureInitialized();
    
    const query = `
      SELECT * FROM medications
      WHERE active = 1
      ORDER BY name
    `;
    
    try {
      const result = await this.db.getAllAsync(query);
      return result.map(med => ({
        ...med,
        times: JSON.parse(med.times)
      }));
    } catch (error) {
      console.error('Error getting medications:', error);
      throw error;
    }
  }

  // 服薬遵守率の計算
  async getMedicationAdherence(startDate, endDate) {
    if (this.shouldUseFirestore()) {
      return await FirestoreService.getMedicationAdherence(startDate, endDate);
    }
    
    await this.ensureInitialized();
    
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(taken) as taken_count
      FROM medication_logs
      WHERE date BETWEEN ? AND ?
    `;
    
    try {
      const result = await this.db.getFirstAsync(query, [startDate, endDate]);
      const adherence = result.total > 0 ? (result.taken_count / result.total) * 100 : 0;
      return {
        total: result.total,
        taken: result.taken_count,
        adherence: adherence
      };
    } catch (error) {
      console.error('Error calculating medication adherence:', error);
      throw error;
    }
  }

  // 現在服用中の薬剤を取得（食品相互作用チェック用）
  async getActiveMedications() {
    await this.ensureInitialized();
    
    const query = `
      SELECT DISTINCT medication_name as name, dosage
      FROM medication_logs
      WHERE date >= date('now', '-7 days')
      ORDER BY medication_name
    `;
    
    try {
      const result = await this.db.getAllAsync(query);
      return result;
    } catch (error) {
      console.error('Error getting active medications:', error);
      throw error;
    }
  }

  // 薬剤の有効/無効を切り替え
  async updateMedicationActive(medicationId, active) {
    await this.ensureInitialized();
    
    const query = `
      UPDATE medications 
      SET active = ? 
      WHERE id = ?
    `;
    
    try {
      await this.db.runAsync(query, [active ? 1 : 0, medicationId]);
    } catch (error) {
      console.error('Error updating medication active status:', error);
      throw error;
    }
  }

  // 薬剤を削除
  async deleteMedication(medicationId) {
    await this.ensureInitialized();
    
    const query = `
      DELETE FROM medications 
      WHERE id = ?
    `;
    
    try {
      await this.db.runAsync(query, [medicationId]);
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }
}

export default new DatabaseService();
