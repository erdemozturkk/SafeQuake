import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { GuideScreen } from '../screens/GuideScreen';
import { Text, View } from 'react-native';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji }) => <Text style={{ fontSize: 24 }}>{emoji}</Text>;

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: () => <TabIcon emoji="🏠" />,
          }}
        />
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            tabBarLabel: 'Map',
            tabBarIcon: () => <TabIcon emoji="🗺️" />,
          }}
        />
        <Tab.Screen
          name="Alerts"
          component={AlertsScreen}
          options={{
            tabBarLabel: 'Alerts',
            tabBarIcon: () => <TabIcon emoji="🔔" />,
          }}
        />
        <Tab.Screen
          name="Contacts"
          component={ContactsScreen}
          options={{
            tabBarLabel: 'Contacts',
            tabBarIcon: () => <TabIcon emoji="👤" />,
          }}
        />
        <Tab.Screen
          name="Guide"
          component={GuideScreen}
          options={{
            tabBarLabel: 'Guide',
            tabBarIcon: () => <TabIcon emoji="📖" />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
