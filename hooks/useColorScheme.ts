import { useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme() {
  // Force dark mode for now
  return 'dark';
  
  // Original system-based approach:
  // return useSystemColorScheme();
}
