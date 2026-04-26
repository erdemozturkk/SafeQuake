// OSM (OpenStreetMap) Service - Overpass API'dan hastaneleri ve acil durum toplanma alanlarını çekmek

import AsyncStorage from '@react-native-async-storage/async-storage';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Türkiye'nin bounding box'ı (min_lat, min_lon, max_lat, max_lon)
const TURKEY_BBOX = '35.8,26.0,42.0,46.0';

// AsyncStorage cache key'leri
const CACHE_KEYS = {
  HOSPITALS: '@safequake_hospitals',
  ASSEMBLY_POINTS: '@safequake_assembly_points',
  LAST_UPDATE: '@safequake_last_update',
};

// Cache ve rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 saniye aralık
const MEMORY_CACHE_DURATION = 3600000; // 1 saat
const STORAGE_CACHE_DURATION = 86400000; // 24 saat (cihaz storage'ında)

const cache = {
  hospitals: null,
  assemblyPoints: null,
  lastUpdate: 0,
};

// Retry logic ile istek yap
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Rate limiting: istek aralığı kontrol et
      const now = Date.now();
      if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => 
          setTimeout(resolve, MIN_REQUEST_INTERVAL - (now - lastRequestTime))
        );
      }
      lastRequestTime = Date.now();

      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        // 429: Too Many Requests - bekle ve tekrar dene
        const waitTime = Math.pow(2, attempt) * 1000; // exponential backoff
        console.log(`⏳ Rate limited. Attempt ${attempt}/${maxRetries}. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export const osmService = {
  // Overpass API sorgusunu çalıştır
  async queryOverpass(query) {
    try {
      const response = await fetchWithRetry(OVERPASS_API_URL, {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/osm3s',
          'User-Agent': 'SafeQuake-Mobile/1.0 (earthquake-safety-app)',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Overpass API Error:', error);
      throw error;
    }
  },

  // Hastaneleri çek (memory + AsyncStorage cache ile)
  async getHospitals() {
    try {
      // 1. Memory cache kontrol et (1 saat)
      if (cache.hospitals && Date.now() - cache.lastUpdate < MEMORY_CACHE_DURATION) {
        console.log('✅ Using hospitals from memory cache');
        return cache.hospitals;
      }

      // 2. AsyncStorage'dan oku (24 saat)
      const storedData = await AsyncStorage.getItem(CACHE_KEYS.HOSPITALS);
      const lastUpdate = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
      
      if (storedData && lastUpdate && Date.now() - parseInt(lastUpdate) < STORAGE_CACHE_DURATION) {
        console.log('✅ Using hospitals from device storage cache');
        const hospitals = JSON.parse(storedData);
        cache.hospitals = hospitals;
        cache.lastUpdate = Date.now();
        return hospitals;
      }

      // 3. API'den çek (simplified, sadece nodes)
      console.log('🌐 Fetching hospitals from Overpass API...');
      const query = `[out:json][timeout:20];
        node["amenity"="hospital"](${TURKEY_BBOX});
        out center;`;

      const data = await this.queryOverpass(query);
      
      const hospitals = (data.elements || [])
        .filter(element => element.lat && element.lon && element.tags && element.tags.name)
        .map(element => ({
          id: element.id,
          name: element.tags.name,
          latitude: element.lat,
          longitude: element.lon,
          type: 'hospital',
          phone: element.tags.phone || '',
          website: element.tags.website || '',
          address: element.tags.addr_street || '',
          icon: '🏥',
        }));

      console.log(`🏥 Found ${hospitals.length} hospitals`);

      // 4. Cache'lere kaydet (asynchronously)
      cache.hospitals = hospitals;
      cache.lastUpdate = Date.now();
      
      AsyncStorage.setItem(CACHE_KEYS.HOSPITALS, JSON.stringify(hospitals))
        .then(() => {
          AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
          console.log(`💾 Saved ${hospitals.length} hospitals to device storage`);
        })
        .catch(storageError => {
          console.warn('⚠️ Could not save hospitals:', storageError);
        });

      return hospitals;

    } catch (error) {
      console.error('Error fetching hospitals:', error);
      
      try {
        const storedData = await AsyncStorage.getItem(CACHE_KEYS.HOSPITALS);
        if (storedData) {
          console.log('⚠️ Using stale hospitals from storage');
          return JSON.parse(storedData);
        }
      } catch (e) {
        console.error('Could not retrieve stored hospitals:', e);
      }
      
      return cache.hospitals || [];
    }
  },

  // Acil durum toplanma alanlarını çek (memory + AsyncStorage cache ile)
  async getAssemblyPoints() {
    try {
      // 1. Memory cache kontrol et (1 saat)
      if (cache.assemblyPoints && Date.now() - cache.lastUpdate < MEMORY_CACHE_DURATION) {
        console.log('✅ Using assembly points from memory cache');
        return cache.assemblyPoints;
      }

      // 2. AsyncStorage'dan oku (24 saat)
      const storedData = await AsyncStorage.getItem(CACHE_KEYS.ASSEMBLY_POINTS);
      const lastUpdate = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
      
      if (storedData && lastUpdate && Date.now() - parseInt(lastUpdate) < STORAGE_CACHE_DURATION) {
        console.log('✅ Using assembly points from device storage cache');
        const assemblyPoints = JSON.parse(storedData);
        cache.assemblyPoints = assemblyPoints;
        cache.lastUpdate = Date.now();
        return assemblyPoints;
      }

      // 3. API'den çek
      console.log('🌐 Fetching assembly points from Overpass API...');
      const query = `[out:json];(
        node["emergency"="assembly_point"](${TURKEY_BBOX});
        way["emergency"="assembly_point"](${TURKEY_BBOX});
        relation["emergency"="assembly_point"](${TURKEY_BBOX});
      );
      out center;`;

      const data = await this.queryOverpass(query);
      
      const assemblyPoints = data.elements
        .filter(element => element.lat && element.lon)
        .map(element => ({
          id: element.id,
          name: element.tags?.name || 'Toplanma Noktası',
          latitude: element.lat,
          longitude: element.lon,
          type: 'assembly_point',
          icon: '🚨',
        }));

      // 4. Cache'lere kaydet (asynchronously, blocking olmasın)
      cache.assemblyPoints = assemblyPoints;
      cache.lastUpdate = Date.now();
      
      // Background'da kaydet, wait etme
      AsyncStorage.setItem(CACHE_KEYS.ASSEMBLY_POINTS, JSON.stringify(assemblyPoints))
        .then(() => {
          AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
          console.log(`💾 Saved ${assemblyPoints.length} assembly points to device storage`);
        })
        .catch(storageError => {
          console.warn('⚠️  Could not save to device storage:', storageError);
        });

      return assemblyPoints;
    } catch (error) {
      console.error('Error fetching assembly points:', error);
      
      // Hata durumunda AsyncStorage'dan eski veri döndür
      try {
        const storedData = await AsyncStorage.getItem(CACHE_KEYS.ASSEMBLY_POINTS);
        if (storedData) {
          console.log('⚠️  Using stale assembly points from device storage');
          return JSON.parse(storedData);
        }
      } catch (e) {
        console.error('Could not retrieve stored assembly points:', e);
      }
      
      return cache.assemblyPoints || [];
    }
  },

  // Hastaneleri ve toplanma noktalarını birlikte çek
  async getOSMLocations() {
    try {
      console.log('📍 getOSMLocations started');
      
      // Hastaneler: 20 saniye timeout
      const hospitalPromise = Promise.race([
        this.getHospitals(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Hospital fetch timeout')), 20000)
        )
      ]).catch(err => {
        console.warn('⚠️ Hospital fetch failed:', err.message);
        return cache.hospitals || [];
      });

      // Toplanma noktaları: 30 saniye timeout
      const assemblyPromise = Promise.race([
        this.getAssemblyPoints(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Assembly points fetch timeout')), 30000)
        )
      ]).catch(err => {
        console.warn('⚠️ Assembly points fetch failed:', err.message);
        return cache.assemblyPoints || [];
      });

      const [hospitals, assemblyPoints] = await Promise.all([
        hospitalPromise,
        assemblyPromise,
      ]);

      console.log('✅ OSM data ready:', { hospitals: hospitals.length, assemblyPoints: assemblyPoints.length });

      return {
        hospitals: hospitals || [],
        assemblyPoints: assemblyPoints || [],
        total: (hospitals?.length || 0) + (assemblyPoints?.length || 0),
      };
    } catch (error) {
      console.error('❌ Error getting OSM locations:', error);
      return {
        hospitals: cache.hospitals || [],
        assemblyPoints: cache.assemblyPoints || [],
        total: (cache.hospitals?.length || 0) + (cache.assemblyPoints?.length || 0),
      };
    }
  },
};
