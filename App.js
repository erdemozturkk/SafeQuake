import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import API_BASE_URL from './config';
import { HomeScreen } from './screens/HomeScreen';
import { MapScreen } from './screens/MapScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import { GuideScreen } from './screens/GuideScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState('login');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedContactName, setSelectedContactName] = useState(null);

  useEffect(() => {
    checkStoredToken();
  }, []);

  // Location tracking hook - sends GPS location every 10 seconds using expo-location
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let locationIntervalId;

    const startLocationTracking = async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied (silent)');
          return;
        }

        // Get location immediately and then every 10 seconds
        const fetchAndSendLocation = async () => {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 1000,
              distanceInterval: 0,
            });

            const { latitude, longitude } = location.coords;
            await sendLocationToBackend(latitude, longitude, token);
          } catch (error) {
            console.log('Location fetch error (silent):', error.message);
          }
        };

        // Send location immediately
        await fetchAndSendLocation();

        // Then every 10 seconds
        locationIntervalId = setInterval(fetchAndSendLocation, 10000);
      } catch (error) {
        console.log('Location tracking setup error (silent):', error.message);
      }
    };

    startLocationTracking();

    return () => {
      if (locationIntervalId) clearInterval(locationIntervalId);
    };
  }, [isAuthenticated, token]);

  const sendLocationToBackend = async (latitude, longitude, authToken) => {
    try {
      await fetch(`${API_BASE_URL}/locations/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });
    } catch (error) {
      console.log('Location send error (silent):', error.message);
    }
  };

  const checkStoredToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (authToken, userData) => {
    try {
      await AsyncStorage.setItem('userToken', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  };

  const handleSignUpSuccess = async (authToken, userData) => {
    try {
      await AsyncStorage.setItem('userToken', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setAuthScreen('login');
      setActiveTab('Home');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const renderAuthScreen = () => {
    if (authScreen === 'signup') {
      return (
        <SignUpScreen
          onSignUpSuccess={handleSignUpSuccess}
          onNavigateToLogin={() => setAuthScreen('login')}
        />
      );
    }
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onNavigateToSignUp={() => setAuthScreen('signup')}
      />
    );
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen onNavigate={setActiveTab} token={token} />;
      case 'Map':
        return <MapScreen token={token} contactIdForLocation={selectedContactId} contactNameForLocation={selectedContactName} onBackFromContactLocation={() => { setSelectedContactId(null); setSelectedContactName(null); setActiveTab('Contacts'); }} />;
      case 'Alerts':
        return <AlertsScreen token={token} />;
      case 'Contacts':
        return <ContactsScreen token={token} onShowContactLocation={(contactId, contactName) => { setSelectedContactId(contactId); setSelectedContactName(contactName); setActiveTab('Map'); }} />;
      case 'Guide':
        return <GuideScreen token={token} />;
      default:
        return <HomeScreen onNavigate={setActiveTab} token={token} />;
    }
  };

  const tabs = [
    { name: 'Home', icon: '🏠', label: 'Home' },
    { name: 'Map', icon: '🗺️', label: 'Map' },
    { name: 'Alerts', icon: '🔔', label: 'Alerts' },
    { name: 'Contacts', icon: '👤', label: 'Contacts' },
    { name: 'Guide', icon: '📖', label: 'Guide' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        {renderAuthScreen()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>


      <View style={styles.header}>
        <Text style={styles.headerTitle}>SafeQuake</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.screenContainer}>{renderScreen()}</View>

      <View style={styles.bottomNav}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={[
              styles.navItem,
              activeTab === tab.name && styles.navItemActive,
            ]}
            onPress={() => setActiveTab(tab.name)}
          >
            <View
              style={[
                styles.iconContainer,
                activeTab === tab.name && styles.iconContainerActive,
              ]}
            >
              <Text style={styles.navIcon}>{tab.icon}</Text>
            </View>
            <Text
              style={[
                styles.navLabel,
                activeTab === tab.name && styles.navLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 25,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  logoutButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  navLabelActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
