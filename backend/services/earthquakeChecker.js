const axios = require('axios');
const { getPool } = require('../config/database');
const sql = require('mssql');

const KANDILLI_API = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';
const MIN_MAGNITUDE = 3.0;

// Haversine formula: 100km içindeyse true
const isWithin100km = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= 100;
};

// Check and save earthquakes
const checkAndSaveEarthquakes = async () => {
  try {
    console.log('🔍 Checking earthquakes from Kandilli API...');
    
    // Fetch from Kandilli API
    const response = await axios.get(KANDILLI_API, { timeout: 10000 });
    const earthquakes = response.data?.result || [];

    if (earthquakes.length === 0) {
      console.log('ℹ️  No earthquakes found');
      return;
    }

    // Filter by magnitude >= 3.0
    const filteredEarthquakes = earthquakes.filter(eq => {
      const mag = parseFloat(eq.mag);
      return mag >= MIN_MAGNITUDE;
    });

    console.log(`📊 Found ${filteredEarthquakes.length} earthquakes with magnitude >= ${MIN_MAGNITUDE}`);

    const pool = getPool();
    let savedCount = 0;
    let notificationCount = 0;

    for (const eq of filteredEarthquakes) {
      try {
        const magnitude = parseFloat(eq.mag);
        const location = eq.title || 'Bilinmiyor';
        const coordinates = eq.geojson?.coordinates || [0, 0];
        const longitude = parseFloat(coordinates[0]) || 0;
        const latitude = parseFloat(coordinates[1]) || 0;
        const depth = parseFloat(eq.depth) || 0;
        const earthquakeTime = eq.date_time || new Date();
        const earthquakeId = eq.earthquake_id || `${magnitude}-${longitude}-${latitude}-${earthquakeTime}`;

        // Check if earthquake already exists
        const checkReq = pool.request();
        checkReq.input('location', sql.NVarChar, location);
        checkReq.input('magnitude', sql.Float, magnitude);
        checkReq.input('latitude', sql.Float, latitude);
        checkReq.input('longitude', sql.Float, longitude);
        checkReq.input('earthquake_time', sql.DateTime, earthquakeTime);

        const existing = await checkReq.query(`
          SELECT id FROM Earthquakes 
          WHERE provider = 'Kandilli' 
            AND location = @location
            AND ABS(magnitude - @magnitude) < 0.1
            AND ABS(latitude - @latitude) < 0.1
            AND ABS(longitude - @longitude) < 0.1
            AND DATEDIFF(MINUTE, earthquake_time, @earthquake_time) < 15
        `);

        if (existing.recordset.length > 0) {
          console.log(`⏭️  Skipping duplicate: ${location} (${magnitude}M)`);
          continue;
        }

        // Save earthquake
        const saveReq = pool.request();
        saveReq.input('magnitude', sql.Float, magnitude);
        saveReq.input('location', sql.NVarChar, location);
        saveReq.input('latitude', sql.Float, latitude);
        saveReq.input('longitude', sql.Float, longitude);
        saveReq.input('depth', sql.Float, depth);
        saveReq.input('earthquake_time', sql.DateTime, earthquakeTime);
        saveReq.input('provider', sql.NVarChar, 'Kandilli');

        const saveResult = await saveReq.query(`
          INSERT INTO Earthquakes (magnitude, location, latitude, longitude, depth, earthquake_time, provider)
          VALUES (@magnitude, @location, @latitude, @longitude, @depth, @earthquake_time, @provider);
          SELECT SCOPE_IDENTITY() as id;
        `);

        const savedEqId = saveResult.recordset[0].id;
        console.log(`✅ Saved: ${location} (${magnitude}M)`);
        savedCount++;

        // If magnitude >= 4.0, notify nearby contacts
        if (magnitude >= 4.0) {
          // Get all users with locations
          const usersReq = pool.request();
          const usersResult = await usersReq.query(`
            SELECT DISTINCT u.id, u.name, ul.latitude, ul.longitude
            FROM Users u
            LEFT JOIN UserLastLocation ul ON u.id = ul.user_id
            WHERE ul.latitude IS NOT NULL AND ul.longitude IS NOT NULL
          `);

          const usersWithLocation = usersResult.recordset;

          for (const user of usersWithLocation) {
            if (isWithin100km(latitude, longitude, user.latitude, user.longitude)) {
              // Get user's emergency contacts
              const contactsReq = pool.request();
              contactsReq.input('user_id', sql.Int, user.id);
              const contactsResult = await contactsReq.query(`
                SELECT related_user_id FROM EmergencyContacts
                WHERE user_id = @user_id AND related_user_id IS NOT NULL
              `);

              const contacts = contactsResult.recordset;

              for (const contact of contacts) {
                const notifReq = pool.request();
                notifReq.input('sender_id', sql.Int, user.id);
                notifReq.input('receiver_id', sql.Int, contact.related_user_id);
                notifReq.input('type', sql.NVarChar, 'earthquake_nearby');
                notifReq.input('message', sql.NVarChar, 
                  `${user.name} ${location}'de ${magnitude} büyüklüğündeki deprem yakınında bulunuyor.`);

                await notifReq.query(`
                  INSERT INTO Notifications (sender_id, receiver_id, type, message, status)
                  VALUES (@sender_id, @receiver_id, @type, @message, 'unread')
                `);

                notificationCount++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing earthquake:`, error.message);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Saved: ${savedCount} earthquakes`);
    console.log(`   Notifications: ${notificationCount} sent`);
  } catch (error) {
    console.error('❌ Earthquake check error:', error.message);
  }
};

// Start periodic check (every 10 seconds)
const startEarthquakeChecker = () => {
  console.log('🚀 Earthquake checker started (interval: 10 seconds)');
  
  // Run immediately
  checkAndSaveEarthquakes();
  
  // Then every 10 seconds
  setInterval(checkAndSaveEarthquakes, 10 * 1000);
};

module.exports = { checkAndSaveEarthquakes, startEarthquakeChecker };
