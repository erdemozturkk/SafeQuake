import { StyleSheet, Text, View } from 'react-native';

export const ContactsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contacts Screen</Text>
      <Text style={styles.subtitle}>Acil kişiler gelecek</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});
