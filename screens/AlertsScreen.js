import { StyleSheet, Text, View, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { useEffect, useState } from 'react';
import { earthquakeService } from '../services/earthquakeService';

export const AlertsScreen = () => {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchEarthquakes();
    // Her 30 saniyede veriyi güncelle
    const interval = setInterval(fetchEarthquakes, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEarthquakes = async () => {
    setLoading(true);
    const data = await earthquakeService.getLiveEarthquakes();
    if (data && data.length > 0) {
      // Son 20 depremi göster
      setEarthquakes(data.slice(0, 20));
      setErrorMsg('');
    } else {
      setErrorMsg('Deprem verisi bulunamadı');
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
      if (diffMins < 60) return `${diffMins} dk`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}s`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}g`;
    } catch {
      return timeString;
    }
  };

  const getMagnitudeColor = (magnitude) => {
    if (magnitude >= 6) return '#DC2626'; // Kırmızı
    if (magnitude >= 4) return '#F59E0B'; // Turuncu
    if (magnitude >= 3) return '#FBBF24'; // Sarı
    return '#10B981'; // Yeşil
  };

  const renderEarthquakeItem = ({ item }) => (
    <View style={styles.earthquakeCard}>
      <View style={[styles.magnitudeBadge, { backgroundColor: getMagnitudeColor(item.magnitude) }]}>
        <Text style={styles.magnitudeText}>{item.magnitude.toFixed(1)}</Text>
      </View>
      
      <View style={styles.earthquakeInfo}>
        <Text style={styles.locationText} numberOfLines={2}>{item.location}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.detailText}>Derinlik: {item.depth} km</Text>
          <Text style={styles.timeText}>{getTimeAgo(item.time)}</Text>
        </View>
        <View style={styles.coordinatesRow}>
          <Text style={styles.coordinateText}>Lat: {item.latitude.toFixed(3)}</Text>
          <Text style={styles.coordinateText}>Lon: {item.longitude.toFixed(3)}</Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Son Depremler</Text>
      <Text style={styles.subtitle}>{earthquakes.length} deprem kaydedildi</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      </View>
    );
  }

  if (earthquakes.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Deprem verisi bulunamadı</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      ListHeaderComponent={renderHeader}
      data={earthquakes}
      renderItem={renderEarthquakeItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={true}
      contentContainerStyle={styles.listContainer}
      style={styles.flatListContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
    paddingBottom: 80,
  },
  flatListContainer: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  listContainer: {
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F8F9FF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  earthquakeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  magnitudeBadge: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  magnitudeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  earthquakeInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  coordinatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordinateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
