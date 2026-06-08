import * as SecureStore from 'expo-secure-store'

export const storage = {
  async get(key) {
    try { return await SecureStore.getItemAsync(key) } catch { return null }
  },
  async set(key, value) {
    await SecureStore.setItemAsync(key, String(value))
  },
  async del(key) {
    await SecureStore.deleteItemAsync(key)
  }
}
