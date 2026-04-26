const axios = require('axios');

const fakeEarthquake = {
  magnitude: 6.2,
  location: 'Ankara Bölgesi',
  latitude: 39.88061,
  longitude: 32.8163133,
  depth: 15.5,
  earthquake_time: new Date().toISOString(),
  provider: 'Test'
};

axios.post('http://localhost:3001/api/earthquakes', fakeEarthquake)
  .then(res => console.log('✅ Deprem eklendi:', res.data))
  .catch(err => console.error('❌ Hata:', err.message));
