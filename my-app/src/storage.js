import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'packageRaport:reports';

export async function loadReports() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function saveReports(reports) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(reports ?? []));
  } catch (e) {
    // ignore
  }
}
