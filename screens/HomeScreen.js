 import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useEffect, useState } from 'react';
import * as Network from 'expo-network';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { earthquakeService } from '../services/earthquakeService';
import { osmService } from '../services/osmService';
import API_BASE_URL from '../config';

const CONTACTS_CACHE_KEY = 'safequake_contacts_cache';

export const HomeScreen = ({ token, onNavigate }) => {
  const [latestEarthquake, setLatestEarthquake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [sendingSafeNotif, setSendingSafeNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchEarthquakeData();
    fetchNotifications();
    // Kontakları önden cache'e kaydet (SMS için)
    preloadContacts();
    
    // Her 30 saniyede veriyi güncelle
    const interval = setInterval(() => {
      fetchEarthquakeData();
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const preloadContacts = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const contacts = await response.json();
        await saveContactsToCache(contacts);
        console.log('✅ Contacts preloaded to cache');
      } else {
        console.log('⚠️ Preload response not ok:', response.status);
      }
    } catch (error) {
      console.log('ℹ️ Could not preload contacts (will use cache):', error.message);
    }
  };

  const fetchEarthquakeData = async () => {
    setLoading(true);
    const earthquakes = await earthquakeService.getLiveEarthquakes();
    if (earthquakes && earthquakes.length > 0) {
      setLatestEarthquake(earthquakes[0]);
      setErrorMsg('');
    } else {
      setErrorMsg('Veri alınamadı');
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        const unread = data.filter(n => n.status === 'unread').length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.log('Fetch notifications error:', error.message);
    }
  };

  const getTimeAgo = (timeString) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Az önce';
      if (diffMins < 60) return `${diffMins} dakika önce`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} saat önce`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} gün önce`;
    } catch {
      return timeString;
    }
  };

  const handleSendSafeNotification = async () => {
    if (!token) {
      Alert.alert('Hata', 'Lütfen önce giriş yapınız');
      return;
    }

    setSendingSafeNotif(true);
    try {
      // İnternet durumunu kontrol et
      const networkState = await Network.getNetworkStateAsync();
      const isConnected = networkState.isConnected && networkState.isInternetReachable;

      if (isConnected) {
        // 1. DURUM: İnternet var - Normal API isteği
        const response = await fetch(`${API_BASE_URL}/notifications/send-safe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          Alert.alert(
            '✓ Başarılı',
            `${data.sent_to_count} kontağa bildirim gönderildi`,
            [{ text: 'Tamam' }]
          );
          fetchNotifications();
        } else {
          Alert.alert('Hata', data.error || data.message || 'Bildirim gönderilemedi');
        }
      } else {
        // 2. DURUM: İnternet yok - SMS'e yönlendir
        Alert.alert(
          'İnternet Bağlantısı Yok',
          'Bildirim SMS olarak gönderilecek. Devam etmek istiyor musunuz?',
          [
            {
              text: 'İptal',
              onPress: () => setSendingSafeNotif(false),
              style: 'cancel',
            },
            {
              text: 'Gönder',
              onPress: async () => {
                await handleSendSafeViaSMS();
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Hata', 'İslem başarısız: ' + error.message);
      setSendingSafeNotif(false);
    }
  };

  const saveContactsToCache = async (data) => {
    try {
      await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(data));
      console.log('💾 Saved to cache:', data.length, 'contacts');
    } catch (error) {
      console.log('❌ Cache save error:', error.message);
    }
  };

  const loadContactsFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CONTACTS_CACHE_KEY);
      if (!cached) {
        console.log('⚠️ Cache is empty');
        return [];
      }
      const parsed = JSON.parse(cached);
      const result = Array.isArray(parsed) ? parsed : [];
      console.log('📦 Loaded from cache:', result.length, 'contacts');
      return result;
    } catch (error) {
      console.log('❌ Cache read error:', error.message);
      return [];
    }
  };

  const handleSendSafeViaSMS = async () => {
    try {
      // Önce network state kontrol et
      const networkState = await Network.getNetworkStateAsync();
      const isNetworkAvailable = networkState.isConnected;
      
      console.log('📡 Network state:', { 
        isConnected: networkState.isConnected, 
        isInternetReachable: networkState.isInternetReachable 
      });

      let contacts = [];

      if (isNetworkAvailable) {
        // İnternet varsa API'den kontakları al
        try {
          console.log('🔄 Fetching contacts from API...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

          const response = await fetch(`${API_BASE_URL}/contacts`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            contacts = await response.json();
            console.log('✅ Contacts fetched from API:', contacts.length);
            await saveContactsToCache(contacts);
          } else {
            console.log('❌ API error:', response.status);
            contacts = await loadContactsFromCache();
          }
        } catch (fetchError) {
          console.log('❌ Network error:', fetchError.message);
          contacts = await loadContactsFromCache();
        }
      } else {
        // İnternet yok, cache'den al
        console.log('📦 Using cached contacts (offline)');
        contacts = await loadContactsFromCache();
      }

      if (!contacts || contacts.length === 0) {
        Alert.alert('Uyarı', 'Bilgilendirilecek kontağınız bulunmuyor');
        setSendingSafeNotif(false);
        return;
      }

      // SMS numaralarını topla (phone veya phone_number'ı kontrol et)
      const phoneNumbers = contacts
        .map(c => c.phone || c.phone_number)
        .filter(phone => phone && phone.trim() !== '');

      console.log('📱 Phone numbers:', phoneNumbers);

      if (phoneNumbers.length === 0) {
        Alert.alert('Uyarı', 'Kontaklarınızın telefon numarası bulunamadı');
        setSendingSafeNotif(false);
        return;
      }

      // SMS servisi kullanılabilir mi kontrol et
      const isSMSAvailable = await SMS.isAvailableAsync();

      if (!isSMSAvailable) {
        Alert.alert('Hata', 'SMS gönderimi bu cihazda desteklenmiyor');
        setSendingSafeNotif(false);
        return;
      }

      // SMS gönder
      const message = 'Ben güvendeyim, merak etmeyin. (SafeQuake - Otomatik bildirim)';
      
      console.log('📤 Sending SMS...');
      await SMS.sendSMSAsync(
        phoneNumbers,
        message
      );

      Alert.alert(
        '✓ Başarılı',
        `${phoneNumbers.length} kontağa SMS gönderildi`,
        [{ text: 'Tamam' }]
      );

    } catch (error) {
      console.error('❌ SMS Error:', error);
      Alert.alert('Hata', 'SMS gönderilemedi: ' + error.message);
    } finally {
      setSendingSafeNotif(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.log('Mark as read error:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (error) {
      console.log('Delete notification error:', error);
    }
  };

  const handleShowEarthquakes = () => {
    onNavigate('Map', { showOSM: false });
  };

  const handleShowHospitals = () => {
    onNavigate('Map', { showOSM: true });
  };

  return (
    <>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.appTitle}>SafeQuake</Text>
              <Text style={styles.subtitle}>Gerçek zamanlı deprem izleme</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

      {/* Latest Alert Card */}
      <View style={styles.alertCard}>
        <Text style={styles.cardLabel}>Son Uyarı</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
          </View>
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : latestEarthquake ? (
          <View style={styles.magnitudeContainer}>
            <Text style={styles.magnitude}>{latestEarthquake.magnitude.toFixed(1)}</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{latestEarthquake.location}</Text>
              <Text style={styles.locationDetails}>Derinlik: {latestEarthquake.depth} km</Text>
              <Text style={styles.time}>{getTimeAgo(latestEarthquake.time)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.errorText}>Bilgi yok</Text>
        )}
      </View>

      {/* I Am Safe Button */}
      <TouchableOpacity 
        style={[styles.safeButton, sendingSafeNotif && { opacity: 0.6 }]}
        onPress={handleSendSafeNotification}
        disabled={sendingSafeNotif}
      >
        {sendingSafeNotif ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.safeButtonIcon}>✓</Text>
            <View style={styles.safeButtonText}>
              <Text style={styles.safeTitle}>Güvendeyim</Text>
              <Text style={styles.safeSubtitle}>Acil durum kişileriyle durumunuzu paylaşın</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Network Status */}
      <View style={styles.networkCard}>
        <View style={styles.networkStatus}>
          <Text style={styles.networkLabel}>Ağ Bağlantısı Aktif</Text>
          <Text style={styles.networkDevices}>7 cihaz yakında bağlı</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>24</Text>
          <Text style={styles.statLabel}>Son 24 saat</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{latestEarthquake ? latestEarthquake.magnitude.toFixed(1) : '—'}</Text>
          <Text style={styles.statLabel}>En yüksek</Text>
        </View>
      </View>

      {/* View Map Button */}
      <TouchableOpacity 
        style={styles.mapButton}
        onPress={handleShowEarthquakes}
      >
        <Text style={styles.mapButtonText}>📍 Depremleri Haritada Görüntüle</Text>
      </TouchableOpacity>

      {/* Show Hospitals Button */}
      <TouchableOpacity 
        style={[styles.mapButton, styles.hospitalsButton]}
        onPress={handleShowHospitals}
      >
        <Text style={styles.mapButtonText}>🏥 Hastaneleri & Toplanma Noktalarını Göster</Text>
      </TouchableOpacity>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bildirimler</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyText}>Henüz bildirim yok</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                renderItem={({ item }) => (
                  <View style={[styles.notificationItem, item.status === 'unread' && styles.notificationItemUnread]}>
                    <View style={styles.notificationItemContent}>
                      <Text style={styles.notificationSenderName}>{item.sender_name}</Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
                      <Text style={styles.notificationTime}>
                        {new Date(item.created_at).toLocaleTimeString('tr-TR')}
                      </Text>
                    </View>
                    <View style={styles.notificationActions}>
                      <TouchableOpacity 
                        onPress={() => handleMarkAsRead(item.id)}
                        style={styles.readButton}
                      >
                        <Text style={styles.readButtonText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteNotification(item.id)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.notificationsList}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 80,
    backgroundColor: '#F8F9FF',
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    paddingVertical: 16,
  },
  magnitudeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  magnitude: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#EF4444',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  safeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  safeButtonIcon: {
    fontSize: 28,
    color: '#fff',
    marginRight: 12,
  },
  safeButtonText: {
    flex: 1,
  },
  safeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  safeSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  networkCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  networkStatus: {
    marginBottom: 12,
  },
  networkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  networkDevices: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  mapButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalsButton: {
    backgroundColor: '#EC4899',
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  notificationsList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationItemUnread: {
    backgroundColor: '#FFFBF0',
    borderColor: '#FEE2E2',
  },
  notificationItemContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationSenderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  readButton: {
    backgroundColor: '#D1FAE5',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
