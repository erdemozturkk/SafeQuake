import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3001/api'
  : 'http://172.20.10.4:3001/api'; // 

export default API_BASE_URL;
5