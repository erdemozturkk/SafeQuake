import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Text, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { earthquakeService } from '../services/earthquakeService';
import { osmService } from '../services/osmService';
import API_BASE_URL from '../config';

export const MapScreen = ({ token, contactIdForLocation, contactNameForLocation, onBackFromContactLocation, route }) => {
  const [earthquakes, setEarthquakes] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [assemblyPoints, setAssemblyPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');
  const [contactLocations, setContactLocations] = useState({ myLocation: null, contactLocation: null });

  // Route'tan showOSM parametresini al
  const showOSM = route?.params?.showOSM ?? false;

  const getTimeAgo = (dateString) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const seconds = Math.floor((now - date) / 1000);
      
      if (seconds < 60) return 'Az önce';
      if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
      return `${Math.floor(seconds / 86400)} gün önce`;
    } catch (e) {
      return 'Bilinmiyor';
    }
  };

  useEffect(() => {
    if (contactIdForLocation) {
      fetchContactLocations();
    } else if (showOSM) {
      fetchOSMLocations();
    } else {
      fetchEarthquakes();
      const interval = setInterval(fetchEarthquakes, 30000);
      return () => clearInterval(interval);
    }
  }, [contactIdForLocation, showOSM]);

  const fetchContactLocations = async () => {
    try {
      setLoading(true);
      
      // Get user's own location
      const myLocRes = await fetch(`${API_BASE_URL}/locations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const myLocData = myLocRes.ok ? await myLocRes.json() : null;
      const myLoc = myLocData?.latitude ? myLocData : null;

      console.log('📍 My location response:', myLocData);

      // Get contact's location by user ID
      const contactRes = await fetch(`${API_BASE_URL}/locations/${contactIdForLocation}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const contactLocData = contactRes.ok ? await contactRes.json() : null;
      const contactLoc = contactLocData?.latitude ? contactLocData : null;

      console.log('📍 Contact location response:', contactLocData);

      setContactLocations({ myLocation: myLoc, contactLocation: contactLoc });
      
      if ((myLoc && myLoc.latitude && myLoc.longitude) || (contactLoc && contactLoc.latitude && contactLoc.longitude)) {
        generateContactMapHTML(myLoc, contactLoc);
      } else {
        Alert.alert(
          'ℹ️ Konum Bilgisi',
          'Sizin veya kontağın konum bilgisi henüz kaydedilmedi. Harita yükleniyor...',
          [{ text: 'Tamam' }]
        );
        // Boş harita göster
        generateContactMapHTML(null, null);
      }
    } catch (error) {
      console.log('Error fetching locations:', error);
      Alert.alert('Hata', error.message);
      setLoading(false);
    }
  };

  const generateContactMapHTML = (myLocation, contactLocation) => {
    let markers = '';
    let centerLat = 39.2;  // Turkey center
    let centerLng = 35.2;

    if (myLocation && myLocation.latitude && myLocation.longitude) {
      const lat = parseFloat(myLocation.latitude);
      const lng = parseFloat(myLocation.longitude);
      const timeAgo = myLocation.updated_at ? getTimeAgo(myLocation.updated_at) : 'Bilinmiyor';
      markers += `
        L.marker([${lat}, ${lng}], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="10" fill="%233B82F6"/%3E%3C/svg%3E',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        }).bindPopup('<b style="font-size: 14px">Buradasınız</b><br/><span style="font-size: 12px">${timeAgo}</span><br/><span style="font-size: 11px">Lon: ${lng.toFixed(4)}<br/>Lat: ${lat.toFixed(4)}</span>').addTo(map);
      `;
      centerLat = lat;
      centerLng = lng;
    }

    if (contactLocation && contactLocation.latitude && contactLocation.longitude) {
      const lat = parseFloat(contactLocation.latitude);
      const lng = parseFloat(contactLocation.longitude);
      const timeAgo = contactLocation.updated_at ? getTimeAgo(contactLocation.updated_at) : 'Bilinmiyor';
      const contactName = contactNameForLocation || 'Kontakt';
      markers += `
        L.marker([${lat}, ${lng}], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="10" fill="%23EF4444"/%3E%3C/svg%3E',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        }).bindPopup('<b style="font-size: 14px">${contactName}</b><br/><span style="font-size: 12px">${timeAgo}</span><br/><span style="font-size: 11px">Lon: ${lng.toFixed(4)}<br/>Lat: ${lat.toFixed(4)}</span>').addTo(map).openPopup();
      `;
      centerLat = lat;
      centerLng = lng;
    }

    // İçeriğe bildirim ekle - konum yoksa
    let infoBox = '';
    if ((!myLocation || !myLocation.latitude) && (!contactLocation || !contactLocation.latitude)) {
      infoBox = `
        <div style="position: absolute; top: 10px; left: 50px; background: #fff; padding: 12px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 1000; max-width: 250px; font-size: 12px;">
          <b>ℹ️ Konum Verisi Yok</b><br/>
          <span style="color: #666;">Henüz konum bilgisi kaydedilmedi. Uygulama açık oldukça konumunuz güncellenecektir.</span>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        ${infoBox}
        <script>
          const positions = [];
          ${myLocation && myLocation.latitude && myLocation.longitude ? `positions.push([${parseFloat(myLocation.latitude)}, ${parseFloat(myLocation.longitude)}]);` : ''}
          ${contactLocation && contactLocation.latitude && contactLocation.longitude ? `positions.push([${parseFloat(contactLocation.latitude)}, ${parseFloat(contactLocation.longitude)}]);` : ''}
          
          let mapCenter = [39.2, 35.2];
          let mapZoom = 6;
          
          if (positions.length > 1) {
            const lats = positions.map(p => p[0]);
            const lngs = positions.map(p => p[1]);
            mapCenter = [(Math.max(...lats) + Math.min(...lats)) / 2, (Math.max(...lngs) + Math.min(...lngs)) / 2];
            mapZoom = 13;
          } else if (positions.length === 1) {
            mapCenter = positions[0];
            mapZoom = 15;
          }
          
          const map = L.map('map').setView(mapCenter, mapZoom);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);
          
          ${markers}
        </script>
      </body>
      </html>
    `;
    setHtmlContent(html);
    setLoading(false);
  };

  const fetchEarthquakes = async () => {
    setLoading(true);
    const data = await earthquakeService.getLiveEarthquakes();
    if (data && data.length > 0) {
      setEarthquakes(data);
      generateMapHTML(data);
    }
    setLoading(false);
  };

  const getMagnitudeColor = (magnitude) => {
    if (magnitude >= 6) return '#DC2626';
    if (magnitude >= 4) return '#F59E0B';
    return '#EAB308';
  };

  const generateMapHTML = (data) => {
    const recentEarthquakes = data.slice(0, 20);
    
    const markers = recentEarthquakes
      .map((eq) => {
        const lat = parseFloat(eq.latitude);
        const lng = parseFloat(eq.longitude);
        const color = getMagnitudeColor(parseFloat(eq.magnitude));
        
        return `
          L.circleMarker([${lat}, ${lng}], {
            radius: ${Math.max(5, parseFloat(eq.magnitude) * 2)},
            fillColor: '${color}',
            color: '#666',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.7
          }).bindPopup('<b>${eq.magnitude}</b><br>${eq.location}<br>${eq.datetime}').addTo(map);
        `;
      })
      .join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; }
          .legend {
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            font-size: 12px;
          }
          .legend-item { display: flex; align-items: center; margin: 5px 0; }
          .legend-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([39.2, 35.2], 6);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);
          
          ${markers}
          
          const legend = L.control({ position: 'bottomright' });
          legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = \`
              <div class="legend-item">
                <div class="legend-dot" style="background-color: #EAB308;"></div>
                < 4.0
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background-color: #F59E0B;"></div>
                4.0 - 6.0
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background-color: #DC2626;"></div>
                ≥ 6.0
              </div>
            \`;
            return div;
          };
          legend.addTo(map);
        </script>
      </body>
      </html>
    `;
    setHtmlContent(html);
  };

  const fetchOSMLocations = async () => {
    try {
      setLoading(true);
      console.log('🗺️ Starting OSM locations fetch...');
      const data = await osmService.getOSMLocations();
      console.log('📊 OSM Data received:', { hospitals: data.hospitals?.length || 0, assemblyPoints: data.assemblyPoints?.length || 0 });
      setHospitals(data.hospitals);
      setAssemblyPoints(data.assemblyPoints);
      if (data.hospitals.length > 0 || data.assemblyPoints.length > 0) {
        console.log('🎨 Generating OSM map HTML...');
        generateOSMMapHTML(data.hospitals, data.assemblyPoints);
      } else {
        console.warn('⚠️ No hospitals or assembly points found');
        Alert.alert('Info', 'Hastane veya toplanma noktası bulunamadı');
      }
    } catch (error) {
      console.error('❌ Error fetching OSM locations:', error);
      Alert.alert('Hata', 'Veri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
      console.log('✅ OSM Loading complete');
    }
  };

  const generateOSMMapHTML = (hospitalData, assemblyPointData) => {
    // Tüm markerları göster (limit yok)
    console.log(`📍 Rendering: ${hospitalData.length} hospitals, ${assemblyPointData.length} assembly points`);

    // Hastane markerlarını oluştur
    const hospitalMarkers = hospitalData.map((hospital) => {
      const lat = parseFloat(hospital.latitude);
      const lng = parseFloat(hospital.longitude);
      const name = hospital.name.replace(/'/g, "\\'");
      const phone = hospital.phone ? `<br/>Tel: ${hospital.phone}` : '';
      
      return `
        L.marker([${lat}, ${lng}], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="10" fill="%23EF4444"/%3E%3Ctext x="16" y="20" text-anchor="middle" font-size="16" fill="white"%3E%2B%3C/text%3E%3C/svg%3E',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        }).bindPopup('<b style="font-size: 14px">🏥 ${name}</b><br/><span style="font-size: 12px">Hastane${phone}</span>').addTo(map);
      `;
    }).join('\n');

    // Toplanma noktası markerlarını oluştur (hepsi)
    const assemblyMarkers = assemblyPointData.map((point) => {
      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      const name = point.name.replace(/'/g, "\\'");
      
      return `
        L.marker([${lat}, ${lng}], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="12" r="8" fill="%23F59E0B"/%3E%3C/svg%3E',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        }).bindPopup('<b style="font-size: 12px">🚨 ${name}</b>').addTo(map);
      `;
    }).join('\n');

    const markers = hospitalMarkers + '\n' + assemblyMarkers;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; }
          .legend {
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            font-size: 12px;
          }
          .legend-item { display: flex; align-items: center; margin: 5px 0; }
          .legend-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          try {
            const map = L.map('map').setView([39.2, 35.2], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            
            ${markers}
            
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function (map) {
              const div = L.DomUtil.create('div', 'legend');
              div.innerHTML = \`
                <div class="legend-item">
                  <div class="legend-dot" style="background-color: #EF4444;"></div>
                  Hastaneler (${hospitalData.length})
                </div>
                <div class="legend-item">
                  <div class="legend-dot" style="background-color: #F59E0B;"></div>
                  Toplanma (${assemblyPointData.length})
                </div>
                <div style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 11px;">
                  Toplam: ${hospitalData.length + assemblyPointData.length}
                </div>
              \`;
              return div;
            };
            legend.addTo(map);
            console.log('✅ Map rendered with all markers');
          } catch(e) {
            console.error('Map Error:', e.message);
          }
        </script>
      </body>
      </html>
    `;
    console.log('📄 OSM HTML set, length:', html.length);
    setHtmlContent(html);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#006AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(contactIdForLocation || showOSM) && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={contactIdForLocation ? onBackFromContactLocation : () => {}}
        >
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
      )}
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scalesPageToFit
        javaScriptEnabled={true}
        startInLoadingState={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView Error:', nativeEvent);
        }}
        onLoadEnd={() => {
          console.log('✅ WebView loaded successfully');
        }}
        onMessage={(event) => {
          console.log('📨 WebView message:', event.nativeEvent.data);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  webview: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006AFF',
  },
});
