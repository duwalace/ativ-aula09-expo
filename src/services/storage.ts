import AsyncStorage from '@react-native-async-storage/async-storage';

const DIARY_KEYS = '@ativ_aula09:diary_entries';
const REPORT_KEYS = '@ativ_aula09:inspection_reports';

export interface DiaryEntry {
  id: string;
  uri: string;
  latitude: number;
  longitude: number;
  timestamp: string; // Guardado como string ISO
}

export interface InspectionReport {
  id: string;
  observations: string;
  photoUri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export async function saveDiaryEntries(entries: DiaryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DIARY_KEYS, JSON.stringify(entries));
  } catch (error) {
    console.error('Erro ao salvar entradas do diário:', error);
  }
}

export async function loadDiaryEntries(): Promise<DiaryEntry[]> {
  try {
    const data = await AsyncStorage.getItem(DIARY_KEYS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar entradas do diário:', error);
    return [];
  }
}

export async function saveInspectionReports(reports: InspectionReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REPORT_KEYS, JSON.stringify(reports));
  } catch (error) {
    console.error('Erro ao salvar relatórios de inspeção:', error);
  }
}

export async function loadInspectionReports(): Promise<InspectionReport[]> {
  try {
    const data = await AsyncStorage.getItem(REPORT_KEYS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar relatórios de inspeção:', error);
    return [];
  }
}
