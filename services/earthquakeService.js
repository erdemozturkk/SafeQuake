import axios from 'axios';

const API_URL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';

export const earthquakeService = {
  // Anlık depremleri al
  getLiveEarthquakes: async () => {
    try {
      const response = await axios.get(API_URL);
      
      // Veri parse et 
      if (response.data && response.data.result) {
        const earthquakes = parseEarthquakeData(response.data.result);
        return earthquakes;
      }
      return [];
    } catch (error) {
      console.error('Deprem verileri alınırken hata:', error);
      return [];
    }
  },
};

// API'den gelen veriyi parse et
const parseEarthquakeData = (earthquakesArray) => {
  try {
    if (!Array.isArray(earthquakesArray)) {
      return [];
    }

    return earthquakesArray.map((item) => {
      // Konum bilgisini title'dan çıkar (örn: "ASAGI CAMLIKALE-HORASAN (ERZURUM)")
      let location = item.title || 'Bilinmiyor';
      
      // Koordinatları geojson'dan al [longitude, latitude]
      const coordinates = item.geojson?.coordinates || [0, 0];
      const longitude = parseFloat(coordinates[0]) || 0;
      const latitude = parseFloat(coordinates[1]) || 0;

      return {
        id: item.earthquake_id || Math.random().toString(),
        magnitude: parseFloat(item.mag) || 0,
        location: location,
        latitude: latitude,
        longitude: longitude,
        depth: parseFloat(item.depth) || 0,
        time: item.date_time || new Date().toISOString(),
        date: new Date(item.date_time || Date.now()).toLocaleDateString('tr-TR'),
        timestamp: item.created_at || Math.floor(Date.now() / 1000),
        provider: item.provider || 'kandilli',
      };
    });
  } catch (error) {
    console.error('Veri parse hatası:', error);
    return [];
  }
};
