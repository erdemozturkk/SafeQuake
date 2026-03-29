import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { earthquakeService } from '../services/earthquakeService';

export const MapScreen = () => {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');

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
      setEarthquakes(data);
      generateMapHTML(data);
    }
    setLoading(false);
  };

  const getMagnitudeColor = (magnitude) => {
    if (magnitude >= 6) return '#DC2626'; // Kırmızı
    if (magnitude >= 4) return '#F59E0B'; // Turuncu
    return '#EAB308'; // Sarı
  };

  const generateMapHTML = (data) => {
    // Son 20 depremi al
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
          
          // Legend
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#006AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scalesPageToFit
        javaScriptEnabled
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
});
