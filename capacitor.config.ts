import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartmanage.app',
  appName: 'SmartManage',
  webDir: 'out',
  server: {
    cleartext: true,
    hostname: 'localhost',
    iosScheme: 'capacitor',
    androidScheme: 'http',
    allowNavigation: [
      '192.168.0.*',
      '192.168.0.28:4000',
      'package-report.vercel.app',
      '*.vercel.app'
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
