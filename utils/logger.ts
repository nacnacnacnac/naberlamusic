/**
 * Production-safe logger utility
 * Development'da normal console.log, production'da sessiz
 */

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Error'ları her zaman göster (production'da da önemli)
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // Firebase ve önemli sistem log'ları için
  system: (...args: any[]) => {
    if (isDevelopment) {
      console.log('🔥', ...args);
    }
  },
  
  // API çağrıları için
  api: (...args: any[]) => {
    if (isDevelopment) {
      console.log('🌐', ...args);
    }
  },
  
  // Video player için
  video: (...args: any[]) => {
    if (isDevelopment) {
      console.log('🎥', ...args);
    }
  },
  
  // Auth için
  auth: (...args: any[]) => {
    if (isDevelopment) {
      console.log('🔐', ...args);
    }
  }
};

// Global console'u override et (opsiyonel)
if (!isDevelopment) {
  // Production'da console.log'ları sessizleştir
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  // console.warn ve console.error'ı koru
}

export default logger;
