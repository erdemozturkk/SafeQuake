import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

export const SettingsScreen = ({ token, onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [magnitude, setMagnitude] = useState(3.0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [token]);

  const loadSettings = async () => {
    try {
      // Load user data
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Load preferences from backend
      const response = await fetch(`${API_BASE_URL}/settings/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMagnitude(data.min_magnitude || 3.0);
        setNotificationsEnabled(data.notifications_enabled !== false);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          min_magnitude: magnitude,
          notifications_enabled: notificationsEnabled,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('✅ Başarılı', 'Ayarlarınız kaydedildi');
      } else {
        console.error('Settings save error:', data);
        Alert.alert('❌ Hata', data.error || 'Ayarlar kaydedilemedi');
      }
    } catch (error) {
      console.error('Request error:', error);
      Alert.alert('❌ Bağlantı Hatası', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Profil</Text>
        <View style={styles.card}>
          {user && (
            <>
              <View style={styles.profileRow}>
                <Text style={styles.label}>Ad Soyad:</Text>
                <Text style={styles.value}>{user.name || 'Belirtilmedi'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.profileRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user.email || 'Belirtilmedi'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.profileRow}>
                <Text style={styles.label}>Telefon:</Text>
                <Text style={styles.value}>{user.phone || 'Belirtilmedi'}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Bildirimler</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Bildirimleri Aç</Text>
              <Text style={styles.settingDescription}>Deprem bildirimlerini almak için açın</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#CCCCCC', true: '#FF6B35' }}
              thumbColor={notificationsEnabled ? '#FF6B35' : '#FFFFFF'}
            />
          </View>
        </View>
      </View>

      {/* Magnitude Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Deprem Eşik Değeri</Text>
        <View style={styles.card}>
          <View style={styles.magnitudeRow}>
            <View>
              <Text style={styles.settingLabel}>Minimum Şiddet</Text>
              <Text style={styles.settingDescription}>Bu değerden büyük depremleri bildir</Text>
            </View>
            <View style={styles.magnitudeValue}>
              <Text style={styles.magnitudeText}>{magnitude.toFixed(1)}</Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={3.0}
            maximumValue={7.0}
            step={0.1}
            value={magnitude}
            onValueChange={setMagnitude}
            minimumTrackTintColor="#FF6B35"
            maximumTrackTintColor="#CCCCCC"
            thumbTintColor="#FF6B35"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>3.0</Text>
            <Text style={styles.sliderLabel}>7.0</Text>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveSettings}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>💾 Ayarları Kaydet</Text>
        )}
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>🚪 Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  magnitudeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  magnitudeValue: {
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  magnitudeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  spacer: {
    height: 20,
  },
});
