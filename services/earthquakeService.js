import axios from 'axios';
import API_BASE_URL from '../config';

// Fallback: AFAD API doğrudan
const AFAD_API_URL = 'https://deprem.afad.gov.tr/apiv2/event/filter';

export const earthquakeService = {
  // Anlık depremleri al
  getLiveEarthquakes: async () => {
    // 1. Önce kendi backend'imizden dene
    try {
      const response = await axios.get(`${API_BASE_URL}/earthquakes/live`, {
        timeout: 15000,
      });

      if (response.data && response.data.result && response.data.result.length > 0) {
        const earthquakes = parseEarthquakeData(response.data.result);
        console.log(`✅ Backend'den ${earthquakes.length} deprem alındı`);
        return earthquakes;
      }
    } catch (error) {
      console.log('⚠️ Backend deprem API hatası:', error.message);
    }

    // 2. Fallback: Doğrudan AFAD API
    try {
      console.log('🔄 AFAD API fallback deneniyor...');
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const formatDate = (d) => d.toISOString().split('T')[0];

      const requestBody = {
        EventSearchFilterList: [
          { FilterType: 8, Value: `${formatDate(yesterday)}T00:00:00.000Z` },
          { FilterType: 9, Value: `${formatDate(now)}T23:59:59.000Z` },
        ],
        Skip: 0,
        Take: 50,
        SortDescriptor: { field: 'eventDate', dir: 'desc' },
      };

      const response = await axios.post(AFAD_API_URL, requestBody, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      if (response.data && Array.isArray(response.data.eventList)) {
        const earthquakes = parseAfadData(response.data.eventList);
        console.log(`✅ AFAD'dan ${earthquakes.length} deprem alındı`);
        return earthquakes;
      }
    } catch (error) {
      console.log('❌ AFAD API de başarısız:', error.message);
    }

    return [];
  },
};

// Backend'den gelen veriyi parse et (Kandilli/AFAD formatında)
const sanitizeDateString = (dateString) => {
  if (!dateString) return new Date().toISOString();
  return String(dateString).replace(/\./g, '-').replace(' ', 'T');
};

const parseEarthquakeData = (earthquakesArray) => {
  try {
    if (!Array.isArray(earthquakesArray)) {
      return [];
    }

    return earthquakesArray.map((item) => {
      let location = item.title || 'Bilinmiyor';
      
      const coordinates = item.geojson?.coordinates || [0, 0];
      const longitude = parseFloat(coordinates[0]) || 0;
      const latitude = parseFloat(coordinates[1]) || 0;

      const cleanDateTime = sanitizeDateString(item.date_time);
      const parsedDate = new Date(cleanDateTime);
      const isValidDate = !isNaN(parsedDate.getTime());
      
      return {
        id: item.earthquake_id || Math.random().toString(),
        magnitude: parseFloat(item.mag) || 0,
        location: location,
        latitude: latitude,
        longitude: longitude,
        depth: parseFloat(item.depth) || 0,
        time: isValidDate ? parsedDate.toISOString() : cleanDateTime,
        datetime: isValidDate ? parsedDate.toLocaleString('tr-TR') : item.date_time,
        date: isValidDate ? parsedDate.toLocaleDateString('tr-TR') : 'Bilinmiyor',
        timestamp: item.created_at || (isValidDate ? Math.floor(parsedDate.getTime() / 1000) : Math.floor(Date.now() / 1000)),
        provider: item.provider || 'kandilli',
      };
    });
  } catch (error) {
    console.error('Veri parse hatası:', error);
    return [];
  }
};

// AFAD doğrudan fallback için ayrı parser
const parseAfadData = (eventList) => {
  try {
    return eventList.map((item) => {
      const lat = parseFloat(item.latitude) || 0;
      const lng = parseFloat(item.longitude) || 0;
      const mag = parseFloat(item.magnitude) || 0;
      const depth = parseFloat(item.depth) || 0;
      const location = (item.location || '').trim();
      
      const cleanAfadDate = sanitizeDateString(item.eventDate);
      let parsedAfadDate = new Date(cleanAfadDate);
      
      let dateTime = cleanAfadDate;
      try {
        if (!isNaN(parsedAfadDate.getTime())) {
          parsedAfadDate.setHours(parsedAfadDate.getHours() + 3); // UTC -> Turkey time
          dateTime = parsedAfadDate.toISOString();
        }
      } catch (e) {}

      const isValidAfadDate = !isNaN(parsedAfadDate.getTime());

      return {
        id: `afad_${lat}_${lng}_${dateTime}`,
        magnitude: mag,
        location: location,
        latitude: lat,
        longitude: lng,
        depth: depth,
        time: dateTime,
        datetime: isValidAfadDate ? parsedAfadDate.toLocaleString('tr-TR') : String(item.eventDate),
        date: isValidAfadDate ? parsedAfadDate.toLocaleDateString('tr-TR') : 'Bilinmiyor',
        timestamp: isValidAfadDate ? Math.floor(parsedAfadDate.getTime() / 1000) : Math.floor(Date.now() / 1000),
        provider: 'afad',
      };
    });
  } catch (error) {
    console.error('AFAD veri parse hatası:', error);
    return [];
  }
};
