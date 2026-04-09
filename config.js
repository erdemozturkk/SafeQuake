import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3001/api'
  : 'http://192.168.68.100:3001/api'; // 

export default API_BASE_URL;
