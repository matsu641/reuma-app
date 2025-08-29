import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import MedicationScreen from './src/screens/MedicationScreen';
import LabValuesScreen from './src/screens/LabValuesScreen';
import ChartsScreen from './src/screens/ChartsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import AddMedicationScreen from './src/screens/AddMedicationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PressureHistoryScreen from './src/screens/PressureHistoryScreen';
import WeatherSettingsScreen from './src/screens/WeatherSettingsScreen';
import FoodLogScreen from './src/screens/FoodLogScreen';
import FoodHistoryScreen from './src/screens/FoodHistoryScreen';
import MedicationListScreen from './src/screens/MedicationListScreen';
import DetailedSymptomScreen from './src/screens/DetailedSymptomScreen';
import LifePatternAnalysisScreen from './src/screens/LifePatternAnalysisScreen';

// Services
import DatabaseService from './src/services/DatabaseService';
import NotificationService from './src/services/NotificationService';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // データベースの初期化
      await DatabaseService.init();
      
      // 通知の初期化
      await NotificationService.setupNotifications();
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('初期化エラー', 'アプリの初期化に失敗しました。アプリを再起動してください。');
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#ffffff' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Medication" component={MedicationScreen} />
          <Stack.Screen name="LabValues" component={LabValuesScreen} />
          <Stack.Screen name="Charts" component={ChartsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="PressureHistory" component={PressureHistoryScreen} />
          <Stack.Screen name="WeatherSettings" component={WeatherSettingsScreen} />
          <Stack.Screen name="FoodLog" component={FoodLogScreen} />
          <Stack.Screen name="FoodHistory" component={FoodHistoryScreen} />
          <Stack.Screen name="MedicationList" component={MedicationListScreen} />
          <Stack.Screen name="DetailedSymptom" component={DetailedSymptomScreen} />
          <Stack.Screen name="LifePatternAnalysis" component={LifePatternAnalysisScreen} />
        </Stack.Navigator>
        <StatusBar style="dark" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
