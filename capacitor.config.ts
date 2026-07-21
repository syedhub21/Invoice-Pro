import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.invoicepro.app',
  appName: 'InvoicePro',
  webDir: 'out',
  server: {
    // Use 'https' scheme for proper CORS and module loading
    androidScheme: 'https',
    // No hostname override needed - Capacitor serves from localhost
  },
  android: {
    // Allow mixed content for local file serving
    allowMixedContent: true,
  },
};

export default config;
