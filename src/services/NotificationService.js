import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.setupNotifications();
  }

  async setupNotifications() {
    // 通知の表示方法を設定
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // 権限の要求
    await this.requestPermissions();
  }

  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('通知を有効にしてください。設定から変更できます。');
      return false;
    }

    return true;
  }

  // 服薬リマインダーの設定
  async scheduleMedicationReminder(medicationName, times) {
    try {
      // 既存の通知をキャンセル
      await this.cancelMedicationReminders(medicationName);

      const notifications = [];
      
      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);
        
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💊 服薬時間です',
            body: `${medicationName}を服用してください`,
            data: { 
              type: 'medication',
              medicationName,
              scheduledTime: time
            },
          },
          trigger: {
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });

        notifications.push({
          identifier,
          medicationName,
          time
        });
      }

      return notifications;
    } catch (error) {
      console.error('Error scheduling medication reminder:', error);
      throw error;
    }
  }

  // 症状記録リマインダーの設定
  async scheduleSymptomReminder(hour = 8, minute = 0) {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📝 症状記録',
          body: '今日の症状を記録しましょう',
          data: { 
            type: 'symptom_reminder'
          },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling symptom reminder:', error);
      throw error;
    }
  }

  // 特定の薬剤のリマインダーをキャンセル
  async cancelMedicationReminders(medicationName) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const toCancel = scheduledNotifications.filter(notification => 
        notification.content.data?.type === 'medication' &&
        notification.content.data?.medicationName === medicationName
      );

      for (const notification of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Error canceling medication reminders:', error);
    }
  }

  // 全ての通知をキャンセル
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // スケジュールされた通知の一覧を取得
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // 通知リスナーを設定
  addNotificationListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // 通知応答リスナーを設定
  addNotificationResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default new NotificationService();
