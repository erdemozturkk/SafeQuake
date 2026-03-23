 import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { earthquakeService } from '../services/earthquakeService';

export const HomeScreen = () => {
  const [latestEarthquake, setLatestEarthquake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchEarthquakeData();
    // Her 30 saniyede veriyi güncelle
    const interval = setInterval(fetchEarthquakeData, 30000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>SafeQuake</Text>
        <Text style={styles.subtitle}>Gerçek zamanlı deprem izleme</Text>
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
      <TouchableOpacity style={styles.safeButton}>
        <Text style={styles.safeButtonIcon}>✓</Text>
        <View style={styles.safeButtonText}>
          <Text style={styles.safeTitle}>Güvendeyim</Text>
          <Text style={styles.safeSubtitle}>Acil durum kişileriyle durumunuzu paylaşın</Text>
        </View>
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
      <TouchableOpacity style={styles.mapButton}>
        <Text style={styles.mapButtonText}>Haritayı & Hastaneleri Görüntüle</Text>
      </TouchableOpacity>
    </ScrollView>
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
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
