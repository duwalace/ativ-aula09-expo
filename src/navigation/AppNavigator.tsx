import React, { ComponentProps } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import BusinessCardScreen from '../screens/BusinessCardScreen';
import LocationDiaryScreen from '../screens/LocationDiaryScreen';
import SecurityAppScreen from '../screens/SecurityAppScreen';
import FieldInspectionScreen from '../screens/FieldInspectionScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: '#94A3B8',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 2,
            shadowColor: '#0F172A',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          },
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            color: '#1E293B',
          },
          tabBarLabelStyle: { 
            fontSize: 11, 
            fontWeight: '600',
            paddingBottom: 4 
          },
          tabBarStyle: { 
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            paddingTop: 6,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: ComponentProps<typeof Ionicons>['name'];

            if (route.name === 'Cartão') {
              iconName = focused ? 'card' : 'card-outline';
            } else if (route.name === 'Diário') {
              iconName = focused ? 'journal' : 'journal-outline';
            } else if (route.name === 'Segurança') {
              iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
            } else {
              iconName = focused ? 'clipboard' : 'clipboard-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Cartão" component={BusinessCardScreen} options={{ title: 'Cartão de Visita' }} />
        <Tab.Screen name="Diário" component={LocationDiaryScreen} options={{ title: 'Diário de Loc.' }} />
        <Tab.Screen name="Segurança" component={SecurityAppScreen} options={{ title: 'App Segurança' }} />
        <Tab.Screen name="Inspeção" component={FieldInspectionScreen} options={{ title: 'Insp. de Campo' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
