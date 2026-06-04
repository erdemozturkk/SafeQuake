import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHECKLIST_KEY = 'safequake_backpack_checklist';

const checklistItems = [
  { id: 1, label: '💧 Su (en az 1 litre kişi başına)' },
  { id: 2, label: '🍞 Gıda (konserve, protein barı, kurutulmuş meyve)' },
  { id: 3, label: '🩹 Birinci yardım malzemeleri' },
  { id: 4, label: '💊 İlaçlar (reçeteli ve genel)' },
  { id: 5, label: '📄 Kimlik belgeleri (pasaport, sertifika)' },
  { id: 6, label: '🕯️ Çakmak/Mum' },
  { id: 7, label: '🔦 Fener ve piller' },
  { id: 8, label: '🧤 Ağır eldiven ve eldiven' },
  { id: 9, label: '😷 Maske (toz ve gaz maskesi)' },
  { id: 10, label: '📞 İletişim numaraları listesi' },
  { id: 11, label: '💰 Para (nakit)' },
  { id: 12, label: '🔨 Bıçak/Kesici aletler' },
  { id: 13, label: '🧲 Bağlama malzemeleri (bant, halat)' },
];

export const GuideScreen = () => {
  const [activeTab, setActiveTab] = useState('before');
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [checklistItems_state, setChecklistItemsState] = useState(
    checklistItems.map(item => ({ ...item, checked: false }))
  );

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    try {
      const saved = await AsyncStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        setChecklistItemsState(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Checklist load error:', error);
    }
  };

  const saveChecklist = async (items) => {
    try {
      await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(items));
    } catch (error) {
      console.log('Checklist save error:', error);
    }
  };

  const toggleChecklistItem = (id) => {
    const updated = checklistItems_state.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklistItemsState(updated);
    saveChecklist(updated);
  };

  const getChecklistStatus = () => {
    const checkedCount = checklistItems_state.filter(item => item.checked).length;
    const totalCount = checklistItems_state.length;
    const uncheckedCount = totalCount - checkedCount;

    if (uncheckedCount === 0) {
      return { text: '✓', color: '#10B981' };
    } else if (uncheckedCount <= 8) {
      return { text: `${uncheckedCount} eksik`, color: '#F59E0B' };
    } else {
      return { text: 'Hazırla', color: '#6366F1' };
    }
  };

  const checklistStatus = getChecklistStatus();

  const beforeEarthquake = [
    {
      title: '🏠 Evde Güvenli Yerler Belirle',
      description: 'Ev içinde güvenli bölgeler tespit et: Masanın altı, iç duvarlar, asansör boşluğu, dış kapı çerçeveleri.',
    },
    {
      title: '📋 Acil Durum Planı Oluştur',
      description: 'Aileden herkesin bilmesi gereken yer, telefon numarası ve birleşme noktasını belirle.',
    },
    {
      title: '🎒 Acil Durum Çantası Hazırla',
      description: 'Su, gıda, birinci yardım malzemeleri, ilaç, kimlik belgeleri ve çakmak/fener ekle.',
    },
    {
      title: '🔧 Kullanıcılara Eğitim Ver',
      description: 'Ailenle deprem sırasında yapılması gereken hareket kurallarını pratik yap.',
    },
    {
      title: '📞 İletişim Planı Yap',
      description: 'Çevredeki ve uzaktaki acil kişilerin numaralarını herkese öğret. SafeQuake uygulamasında kontakları ekle.',
    },
    {
      title: '🏗️ Evinizi Kontrol Et',
      description: 'Ağır mobilyaları duvara sabitle. Kütüphaneler, raflar asılı nesneleri güvence altına al.',
    },
    {
      title: '💧 Temel Malzeme Stoku',
      description: 'Tornavidalar, kesici aletler, el fenerleri, ağır eldivenleri erişilebilir yerde bulundur.',
    },
  ];

  const duringEarthquake = [
    {
      title: '⚡ İlk Saniyede Hızlı Hareket Et',
      description: 'Depremi hissettiğin ilk saniyelerde hemen harekete geç, ağır eşyaların etrafından uzaklaşın.',
    },
    {
      title: '🤐 Güvenli Pozisyon Al (Drop-Cover-Hold)',
      description: 'Düş → Kapan (ellerinle baş çevresini koru) → Tut (sarsılmaya direniş göster) pozisyonunu uygula.',
    },
    {
      title: '🧱 İç Duvarların Yanında Kal',
      description: 'Pencerelerin, aynaların, asılı nesnelerin ve kapıların yanından uzak dur.',
    },
    {
      title: '🚪 Dışarıdaysan Açık Alan Bul',
      description: 'Bina, ağaç veya tellerin uzağında açık bir alana git. Tuğla/cam kayması riskinden kaçın.',
    },
    {
      title: '🚗 Araçta İsen Dur',
      description: 'Güvenli şekilde araçı yolun kenarına çek, cıvata emniyetine otur, sarslama bitene kadar bekle.',
    },
    {
      title: '🏛️ Asansörde İsen Buton Kullan',
      description: 'Tüm katların düğmesine basmaya çalış (bu sayede asansör en yakın katta duracaktır) ve kapılar açılınca çık. Kapalı kalırsan sessiz kal ve yardım çağır.',
    },
    {
      title: '🤐 Sessiz Kal, Telefon Etme',
      description: 'Kurtarma ekiplerinin iletişim  kanallarını etkili kullanabilmesi için gereksiz aramalar yapmayın.',
    },
  ];

  const afterEarthquake = [
    {
      title: '🚨 Yaralanmaları Kontrol Et',
      description: 'Çevrenin ve etrafındaki kişilerin durumunu kontrol et. Yaralılara basit ilk yardımı uygula.',
    },
    {
      title: '🏠 Evin Hasar Durumunu Kontrol Et',
      description: 'Çatlamalar, gaz sızıntıları, elektrik hasarlarını dikkatli incele. Şüpheli durumda çık.',
    },
    {
      title: '💨 Gaz Tesisatını Kontrol Et',
      description: 'Gaz kokusu varsa havalandırma açıp çık. Gaz musluğunu veya sayacı kapatmayı dene.',
    },
    {
      title: '⚡ Elektrik Kablolarına Dikkat',
      description: 'Açık kablolara, hasarlı aletlere dokunma. Şüpheli durumda elektrik sigortasını kapat.',
    },
    {
      title: '🚗 Göçük Alanlardan Uzak Dur',
      description: 'Bina çöküntüsü olabilir. Tehlikeli yapılardan uzak dur ve kurtarma ekiplerine yer ver.',
    },
    {
      title: '📱 Bildirim Gönder',
      description: 'SafeQuake uygulamasında "Güvendeyim" bildirimini gönder ve sevdikleri endişeyi azalt.',
    },
    {
      title: '📻 Resmi Bilgi Dinle',
      description: 'Yerel radyo, TV veya resmi siren uyarılarını takip et. Söylentilere inanma.',
    },
    {
      title: '🏥 Yaraları Kontrol Et ve Tedavi Gör',
      description: 'Daha sonra ciddi yaraları hastanede kontrol ettir. Psikolojik destek de hayati olabilir.',
    },
  ];

  const GuideSection = ({ title, tips }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {tips.map((tip, idx) => (
        <View key={idx} style={styles.tipContainer}>
          <View style={styles.tip}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipDescription}>{tip.description}</Text>
          </View>
          {/* Acil Çanta Hazırla için checklist butonu */}
          {idx === 2 && activeTab === 'before' && (
            <TouchableOpacity
              style={[styles.checklistButton, { backgroundColor: checklistStatus.color }]}
              onPress={() => setChecklistVisible(true)}
            >
              <Text style={styles.checklistButtonText}>{checklistStatus.text}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Buttons */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'before' && styles.tabButtonActive]}
          onPress={() => setActiveTab('before')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'before' && styles.tabButtonTextActive]}>
            Deprem Öncesi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'during' && styles.tabButtonActive]}
          onPress={() => setActiveTab('during')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'during' && styles.tabButtonTextActive]}>
            Deprem Sırası
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'after' && styles.tabButtonActive]}
          onPress={() => setActiveTab('after')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'after' && styles.tabButtonTextActive]}>
            Deprem Sonrası
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'before' && (
          <GuideSection
            title="📋 Deprem Öncesinde Hazırlanma"
            tips={beforeEarthquake}
          />
        )}
        {activeTab === 'during' && (
          <GuideSection
            title="⚡ Deprem Sırasında Yapılması Gerekenler"
            tips={duringEarthquake}
          />
        )}
        {activeTab === 'after' && (
          <GuideSection
            title="🆘 Deprem Sonrasında Yapılması Gerekenler"
            tips={afterEarthquake}
          />
        )}
      </ScrollView>

      {/* Checklist Modal */}
      <Modal
        visible={checklistVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setChecklistVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎒 Acil Çanta Kontrol Listesi</Text>
              <TouchableOpacity onPress={() => setChecklistVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={checklistItems_state}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.checklistItem, item.checked && styles.checklistItemChecked]}
                  onPress={() => toggleChecklistItem(item.id)}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={[styles.checklistItemLabel, item.checked && styles.checklistItemLabelChecked]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.checklistList}
            />

            <View style={styles.modalFooter}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {checklistItems_state.filter(i => i.checked).length}/{checklistItems_state.length} Tamamlandı
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(checklistItems_state.filter(i => i.checked).length / checklistItems_state.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#EF4444',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabButtonTextActive: {
    color: '#EF4444',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  section: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    paddingTop: 8,
  },
  tipContainer: {
    marginBottom: 12,
  },
  tip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  checklistButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  checklistButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  checklistList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checklistItemChecked: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checklistItemLabel: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  checklistItemLabelChecked: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressInfo: {
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
});
