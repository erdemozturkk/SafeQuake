import { StyleSheet, Text, View } from 'react-native';

export const GuideScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Guide Screen</Text>
      <Text style={styles.subtitle}>Rehber gelecek</Text>
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
