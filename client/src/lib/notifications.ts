import notificationSound from '@assets/740420__anthonyrox__message-notification-1_1762785683206.wav';

class NotificationManager {
  private audio: HTMLAudioElement | null = null;
  private permissionGranted: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Initialize audio
    this.audio = new Audio(notificationSound);
    
    // Request notification permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permissionGranted = permission === 'granted';
    return this.permissionGranted;
  }

  playSound() {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play().catch(err => console.error('Error playing notification sound:', err));
    }
  }

  showNotification(title: string, options?: NotificationOptions) {
    // Don't show notification if page is focused
    if (document.hasFocus()) {
      this.playSound();
      return;
    }

    // Play sound
    this.playSound();

    // Show notification if permission granted
    if (this.permissionGranted && 'Notification' in window) {
      const notification = new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        ...options,
      });

      // Focus window on click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }

  notifyNewMessage(contactName: string, message: string) {
    this.showNotification(`New message from ${contactName}`, {
      body: message,
      tag: 'new-message',
    });
  }

  notifyNewContact(contactName: string) {
    this.showNotification(`New contact added`, {
      body: `${contactName} has been added to your contacts`,
      tag: 'new-contact',
    });
  }
}

// Singleton instance
let notificationManager: NotificationManager | null = null;

export function getNotificationManager(): NotificationManager {
  if (!notificationManager) {
    notificationManager = new NotificationManager();
  }
  return notificationManager;
}
