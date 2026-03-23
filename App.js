import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './screens/HomeScreen';
import { MapScreen } from './screens/MapScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import { GuideScreen } from './screens/GuideScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen />;
      case 'Map':
        return <MapScreen />;
      case 'Alerts':
        return <AlertsScreen />;
      case 'Contacts':
        return <ContactsScreen />;
      case 'Guide':
        return <GuideScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const tabs = [
    { name: 'Home', icon: '🏠', label: 'Home' },
    { name: 'Map', icon: '🗺️', label: 'Map' },
    { name: 'Alerts', icon: '🔔', label: 'Alerts' },
    { name: 'Contacts', icon: '👤', label: 'Contacts' },
    { name: 'Guide', icon: '📖', label: 'Guide' },
  ];

  return (
    <SafeAreaView style={styles.container}>
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
