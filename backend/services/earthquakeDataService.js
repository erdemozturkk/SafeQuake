const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

// ─── Veri Kaynakları ───
const KANDILLI_XML_URL = 'http://udim.koeri.boun.edu.tr/zeqmap/xmlt/son24saat.xml';
const AFAD_API_URL = 'https://deprem.afad.gov.tr/apiv2/event/filter';

// ─── In-Memory Cache ───
let cache = {
  data: null,
  lastUpdate: 0,
};
const CACHE_TTL = 60 * 1000; // 60 saniye

// ─── XML Parser ───
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  attributeNamePrefix: '@_',
  isArray: (_name, jpath) => {
    if (jpath === 'eqlist.earhquake') return true;
  },
});

/**
 * Kandilli XML verisini parse et
 */
function parseKandilliData(xmlData) {
  try {
    const parsed = xmlParser.parse(xmlData);

    if (!parsed.eqlist || !parsed.eqlist.earhquake) {
      console.log('⚠️ Kandilli XML: eqlist.earhquake bulunamadı');
      return [];
    }

    const earthquakes = parsed.eqlist.earhquake;
    if (!Array.isArray(earthquakes)) {
      console.log('⚠️ Kandilli XML: veri array değil');
      return [];
    }

    return earthquakes.map((eq) => {
      const lokasyon = (eq['@_lokasyon'] || '').trim();
      const lng = parseFloat(eq['@_lng']) || 0;
      const lat = parseFloat(eq['@_lat']) || 0;
      const mag = parseFloat(eq['@_mag']) || 0;
      const depth = parseFloat(eq['@_Depth']) || 0;
      const dateTime = eq['@_name'] || new Date().toISOString();

      return {
        earthquake_id: `kandilli_${lat}_${lng}_${dateTime}`,
        provider: 'kandilli',
        title: lokasyon,
        mag: mag,
        depth: depth,
        geojson: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        date_time: dateTime,
        created_at: Math.floor(new Date(dateTime).getTime() / 1000),
        location_tz: 'Europe/Istanbul',
      };
    });
  } catch (error) {
    console.error('❌ Kandilli XML parse hatası:', error.message);
    return [];
  }
}

/**
 * AFAD API'sinden veri çek ve parse et
 */
async function fetchFromAFAD() {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const formatDate = (d) => d.toISOString().split('T')[0];

    const requestBody = {
      EventSearchFilterList: [
        {
          FilterType: 8,
          Value: `${formatDate(yesterday)}T00:00:00.000Z`,
        },
        {
          FilterType: 9,
          Value: `${formatDate(now)}T23:59:59.000Z`,
        },
      ],
      Skip: 0,
      Take: 100,
      SortDescriptor: {
        field: 'eventDate',
        dir: 'desc',
      },
    };

    const response = await axios.post(AFAD_API_URL, requestBody, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://deprem.afad.gov.tr',
        'Referer': 'https://deprem.afad.gov.tr/last-earthquakes',
      },
      timeout: 15000,
    });

    if (response.data && Array.isArray(response.data.eventList)) {
      return response.data.eventList.map((eq) => {
        const lng = parseFloat(eq.longitude) || 0;
        const lat = parseFloat(eq.latitude) || 0;
        const mag = parseFloat(eq.magnitude) || 0;
        const depth = parseFloat(eq.depth) || 0;
        const location = (eq.location || '').trim();
        
        // AFAD tarihi UTC, +3 saat ekle (Türkiye saati)
        let dateTime = eq.eventDate || new Date().toISOString();
        try {
          const d = new Date(dateTime);
          d.setHours(d.getHours() + 3);
          dateTime = d.toISOString().replace('T', ' ').substring(0, 19);
        } catch (e) {}

        return {
          earthquake_id: `afad_${lat}_${lng}_${dateTime}`,
          provider: 'afad',
          title: location,
          mag: mag,
          depth: depth,
          geojson: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          date_time: dateTime,
          created_at: Math.floor(new Date(eq.eventDate).getTime() / 1000),
          location_tz: 'Europe/Istanbul',
        };
      });
    }

    return [];
  } catch (error) {
    console.error('❌ AFAD API hatası:', error.message);
    return [];
  }
}

/**
 * Kandilli XML'den veri çek
 */
async function fetchFromKandilli() {
  try {
    const response = await axios.get(KANDILLI_XML_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'SafeQuake-App/1.0',
      },
    });

    if (!response.data) {
      console.log('⚠️ Kandilli XML: boş yanıt');
      return [];
    }

    return parseKandilliData(response.data);
  } catch (error) {
    console.error('❌ Kandilli XML fetch hatası:', error.message);
    return [];
  }
}

/**
 * Ana fonksiyon: Deprem verilerini çek (cache ile)
 * Önce Kandilli, başarısız olursa AFAD'a fallback
 */
async function getLiveEarthquakes() {
  // Cache kontrolü
  const now = Date.now();
  if (cache.data && (now - cache.lastUpdate) < CACHE_TTL) {
    console.log('✅ Deprem verisi cache\'den döndürülüyor');
    return cache.data;
  }

  console.log('🔄 Deprem verisi çekiliyor...');

  let earthquakes = [];

  // 1. Kandilli'den dene
  const kandilliData = await fetchFromKandilli();
  if (kandilliData.length > 0) {
    console.log(`✅ Kandilli: ${kandilliData.length} deprem alındı`);
    earthquakes = kandilliData;
  }

  // 2. AFAD'dan da dene (ek veri veya fallback)
  const afadData = await fetchFromAFAD();
  if (afadData.length > 0) {
    console.log(`✅ AFAD: ${afadData.length} deprem alındı`);
    
    if (earthquakes.length === 0) {
      // Kandilli başarısız olduysa sadece AFAD verisi kullan
      earthquakes = afadData;
    }
    // Kandilli verisi varsa onu tercih et (daha detaylı)
  }

  if (earthquakes.length === 0) {
    console.log('⚠️ Hiçbir kaynaktan deprem verisi alınamadı');
    // Eski cache'i döndür (varsa)
    return cache.data || [];
  }

  // Tarihe göre sırala (en yeni önce)
  earthquakes.sort((a, b) => {
    return (b.created_at || 0) - (a.created_at || 0);
  });

  // Cache'i güncelle
  cache.data = earthquakes;
  cache.lastUpdate = now;

  return earthquakes;
}

module.exports = {
  getLiveEarthquakes,
  fetchFromKandilli,
  fetchFromAFAD,
};
