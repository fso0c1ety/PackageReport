import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartmanage.app',
  appName: 'SmartManage',
  webDir: 'out',
  server: {
    cleartext: true,
    androidScheme: 'http',
    allowNavigation: [
      '192.168.0.*',
      '192.168.0.28:4000'
    ]
  }
};

export default config;
