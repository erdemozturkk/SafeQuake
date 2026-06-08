// Hızlı test: Kandilli XML + AFAD API veri çekme testi
const earthquakeDataService = require('./services/earthquakeDataService');

async function test() {
  console.log('=== Deprem Veri Servisi Test ===\n');

  // 1. Kandilli XML testi
  console.log('--- Kandilli XML Test ---');
  const kandilliData = await earthquakeDataService.fetchFromKandilli();
  console.log(`Kandilli: ${kandilliData.length} deprem bulundu`);
  if (kandilliData.length > 0) {
    console.log('İlk deprem:', JSON.stringify(kandilliData[0], null, 2));
  }

  console.log('\n--- AFAD API Test ---');
  const afadData = await earthquakeDataService.fetchFromAFAD();
  console.log(`AFAD: ${afadData.length} deprem bulundu`);
  if (afadData.length > 0) {
    console.log('İlk deprem:', JSON.stringify(afadData[0], null, 2));
  }

  console.log('\n--- Birleşik Sonuç ---');
  const allData = await earthquakeDataService.getLiveEarthquakes();
  console.log(`Toplam: ${allData.length} deprem`);

  console.log('\n=== Test Tamamlandı ===');
  process.exit(0);
}

test().catch(err => {
  console.error('Test hatası:', err);
  process.exit(1);
});
