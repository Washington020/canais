import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private pushToken: string | null = null;
  private permissionGranted: boolean = false;

  /**
   * Initialize notification service - request permissions and get push token
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if we're on a physical device
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return false;
      }

      // Request permissions
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        return false;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        // Save token to backend
        await this.savePushTokenToBackend(token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permissions from user
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.permissionGranted = finalStatus === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Get push token from Expo
   */
  private async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || 'luxepass-project',
      });
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Save push token to backend
   */
  private async savePushTokenToBackend(token: string): Promise<void> {
    try {
      const userToken = await AsyncStorage.getItem('token');
      if (!userToken) return;

      await axios.post(
        `${API_URL}/notifications/register-token`,
        { push_token: token },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    } catch (error) {
      console.error('Error saving push token to backend:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string | null> {
    if (!this.permissionGranted) {
      console.log('Notification permissions not granted');
      return null;
    }

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: trigger || null, // null means immediate
      });
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Listener for when notification is received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap here
      this.handleNotificationResponse(response);
    });

    return {
      notificationListener,
      responseListener,
    };
  }

  /**
   * Handle notification tap
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;

    // Route based on notification data
    if (data.type === 'payment_reminder') {
      // Navigate to financial screen
      console.log('Navigate to financial screen');
    } else if (data.type === 'token_expiry') {
      // Navigate to tokens screen
      console.log('Navigate to tokens screen');
    } else if (data.type === 'gym_reminder') {
      // Navigate to gyms screen
      console.log('Navigate to gyms screen');
    }
  }

  /**
   * Schedule payment reminder notifications
   */
  async schedulePaymentReminder(daysBeforeExpiry: number = 3): Promise<void> {
    try {
      const title = '💳 Lembrete de Pagamento';
      const body = `Sua assinatura LuxePass vence em ${daysBeforeExpiry} dias. Renove para continuar aproveitando!`;

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: daysBeforeExpiry * 24 * 60 * 60, // Convert days to seconds
        repeats: false,
      };

      await this.scheduleLocalNotification(title, body, trigger, {
        type: 'payment_reminder',
        days_before: daysBeforeExpiry,
      });
    } catch (error) {
      console.error('Error scheduling payment reminder:', error);
    }
  }

  /**
   * Schedule token usage reminder
   */
  async scheduleTokenReminder(): Promise<void> {
    try {
      const title = '🏃‍♂️ Hora do Treino!';
      const body = 'Você ainda tem tokens disponíveis. Que tal visitar uma academia hoje?';

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 24 * 60 * 60, // 24 hours
        repeats: true,
      };

      await this.scheduleLocalNotification(title, body, trigger, {
        type: 'token_expiry',
        action: 'use_tokens',
      });
    } catch (error) {
      console.error('Error scheduling token reminder:', error);
    }
  }

  /**
   * Schedule gym visit reminder
   */
  async scheduleGymReminder(gymName: string, hours: number = 2): Promise<void> {
    try {
      const title = '💪 Lembrete de Academia';
      const body = `Não se esqueça do seu treino na ${gymName} em ${hours} horas!`;

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: hours * 60 * 60, // Convert hours to seconds
        repeats: false,
      };

      await this.scheduleLocalNotification(title, body, trigger, {
        type: 'gym_reminder',
        gym_name: gymName,
        hours_before: hours,
      });
    } catch (error) {
      console.error('Error scheduling gym reminder:', error);
    }
  }

  /**
   * Schedule welcome notification for new users
   */
  async scheduleWelcomeNotification(): Promise<void> {
    try {
      const title = '🎉 Bem-vindo ao LuxePass!';
      const body = 'Explore as academias parceiras e comece sua jornada fitness hoje mesmo!';

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5, // 5 seconds delay
        repeats: false,
      };

      await this.scheduleLocalNotification(title, body, trigger, {
        type: 'welcome',
        action: 'explore_gyms',
      });
    } catch (error) {
      console.error('Error scheduling welcome notification:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.pushToken;
  }
}

export const notificationService = new NotificationService();
export default NotificationService;