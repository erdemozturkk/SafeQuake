import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

const CONTACTS_CACHE_KEY = 'safequake_contacts_cache';

export const ContactsScreen = ({ token, onShowContactLocation }) => {
  const [activeTab, setActiveTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const saveContactsToCache = async (data) => {
    try {
      await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log('Contacts cache save error:', error.message);
    }
  };

  const loadContactsFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CONTACTS_CACHE_KEY);
      if (!cached) {
        return [];
      }

      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.log('Contacts cache read error:', error.message);
      return [];
    }
  };

  const hasInternetConnection = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchContacts();
    } else {
      fetchRequests();
    }
  }, [token, activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/friend-requests/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setRequests(await response.json());
      }
    } catch (error) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (id, status) => {
    try {
      await fetch(`${API_BASE_URL}/friend-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      Alert.alert('Başarılı', status === 'accepted' ? 'Kabul edildi' : 'Reddedildi');
      fetchRequests();
    } catch (error) {
      Alert.alert('Hata', error.message);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);

      const online = await hasInternetConnection();
      if (!online) {
        const cachedContacts = await loadContactsFromCache();
        setContacts(cachedContacts);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/contacts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data);
        await saveContactsToCache(data);
      } else {
        const cachedContacts = await loadContactsFromCache();
        setContacts(cachedContacts);
        Alert.alert('Hata', 'Kontaktlar yüklenemedi, yerel liste gösteriliyor.');
      }
    } catch (error) {
      const cachedContacts = await loadContactsFromCache();
      setContacts(cachedContacts);
      Alert.alert('Hata', 'İnternet yok, yerel liste gösteriliyor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!formName || !formPhone) {
      Alert.alert('Hata', 'Tüm alanları doldurunuz');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API_BASE_URL}/contacts/${editingId}`
        : `${API_BASE_URL}/contacts`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
        }),
      });

      if (response.ok) {
        Alert.alert('Başarılı', editingId ? 'Kontakt güncellendi' : 'Kontakt eklendi');
        setFormName('');
        setFormPhone('');
        setEditingId(null);
        setShowModal(false);
        fetchContacts();
      } else {
        Alert.alert('Hata', 'İşlem başarısız oldu');
      }
    } catch (error) {
      Alert.alert('Hata', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (contact) => {
    setEditingId(contact.id);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setShowModal(true);
  };

  const handleDelete = (contactId) => {
    Alert.alert('Sil', 'Bu kontaktı silmek istediğinize emin misiniz?', [
      { text: 'İptal', onPress: () => {} },
      {
        text: 'Sil',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              Alert.alert('Başarılı', 'Kontakt silindi');
              fetchContacts();
            } else {
              Alert.alert('Hata', 'Silme başarısız oldu');
            }
          } catch (error) {
            Alert.alert('Hata', error.message);
          }
        },
      },
    ]);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormName('');
    setFormPhone('');
    setEditingId(null);
  };

  const handleShowContactLocation = async (contactItem) => {
    const userIdToShow = contactItem.related_user_id || contactItem.id;
    onShowContactLocation && onShowContactLocation(userIdToShow, contactItem.name);
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: '#E0E7FF' }]}
          onPress={() => handleShowContactLocation(item)}
        >
          <Text style={styles.actionText}>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.actionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.actionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const renderRequestCard = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.sender_name}</Text>
        <Text style={styles.contactPhone}>{item.sender_email || item.sender_phone}</Text>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity style={[styles.editButton, { backgroundColor: '#D1FAE5' }]} onPress={() => handleResponse(item.id, 'accepted')}>
          <Text style={styles.actionText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.editButton, { backgroundColor: '#FEE2E2' }]} onPress={() => handleResponse(item.id, 'rejected')}>
          <Text style={styles.actionText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'contacts' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('contacts')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'contacts' && styles.tabButtonTextActive]}>İletişi Kişileri</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'requests' && styles.tabButtonTextActive]}>Arkadaş İstekleri</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'contacts' ? (
        <View style={styles.tabContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Yakınlarım</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.addButtonText}>+ Ekle</Text>
            </TouchableOpacity>
          </View>

          {contacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz acil iletişim kişisi eklenmedi</Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              renderItem={renderContact}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      ) : (
        <View style={styles.tabContent}>
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Arkadaş isteği yok</Text>
            </View>
          ) : (
            <FlatList
              data={requests}
              renderItem={renderRequestCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Kontaktı Düzenle' : 'Yeni Kontakt Ekle'}
              </Text>

              <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={styles.label}>Ad Soyad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ad Soyad"
                  value={formName}
                  onChangeText={setFormName}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+905001234567"
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </ScrollView>

              <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCloseModal}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, submitting && { opacity: 0.6 }]}
                onPress={handleAddOrUpdate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#FF6B35',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabButtonTextActive: {
    color: '#FF6B35',
  },
  tabContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  actionText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
