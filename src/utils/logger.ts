// Simple logger utility
export const logger = {
  info: (message: string, ...args: any[]) => {
    // Hanya tampilkan log info di development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  error: (message: string, error?: any) => {
    // Error tetap perlu ditampilkan di semua environment
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  },
  
  warn: (message: string, ...args: any[]) => {
    // Warning tetap perlu ditampilkan di semua environment
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  
  debug: (message: string, ...args: any[]) => {
    // Debug hanya ditampilkan di development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}; 