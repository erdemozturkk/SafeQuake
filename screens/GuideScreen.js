import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import API_BASE_URL from '../config';

const UsersListTab = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/friend-requests/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (error) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/friend-requests/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: userId }),
      });
      if (response.ok) {
        Alert.alert('Başarılı', 'İstek gönderildi');
        setSentRequests([...sentRequests, userId]);
      }
    } catch (error) {
      Alert.alert('Hata', error.message);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF6B35" size="large" /></View>;

  return (
    <FlatList
      data={users}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.detail}>{item.email || item.phone}</Text>
          </View>
          <TouchableOpacity
            style={[styles.btn, sentRequests.includes(item.id) && styles.btnDisabled]}
            onPress={() => handleSendRequest(item.id)}
            disabled={sentRequests.includes(item.id)}
          >
            <Text style={styles.btnText}>{sentRequests.includes(item.id) ? '✔' : '+'}</Text>
          </TouchableOpacity>
        </View>
      )}
      keyExtractor={i => i.id.toString()}
      contentContainerStyle={styles.list}
    />
  );
};

const RequestsTab = ({ token }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    try {
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

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF6B35" size="large" /></View>;

  return (
    <FlatList
      data={requests}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.sender_name}</Text>
            <Text style={styles.detail}>{item.sender_email || item.sender_phone}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#D1FAE5' }]} onPress={() => handleResponse(item.id, 'accepted')}>
              <Text style={styles.btnText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleResponse(item.id, 'rejected')}>
              <Text style={styles.btnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      keyExtractor={i => i.id.toString()}
      contentContainerStyle={styles.list}
    />
  );
};

export const GuideScreen = ({ token }) => {
  const [tab, setTab] = useState('users');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'users' && styles.tabActive]} onPress={() => setTab('users')}>
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Kullanıcılar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'requests' && styles.tabActive]} onPress={() => setTab('requests')}>
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>İstekler</Text>
        </TouchableOpacity>
      </View>
      {tab === 'users' ? <UsersListTab token={token} /> : <RequestsTab token={token} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#FF6B35' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#FF6B35' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 12, paddingVertical: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  name: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  detail: { fontSize: 14, color: '#6B7280' },
  btn: { backgroundColor: '#FF6B35', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { backgroundColor: '#D1D5DB' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
