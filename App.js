import React, { useEffect } from 'react'
import { StatusBar, TouchableOpacity, View, StyleSheet } from 'react-native'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Notifications from 'expo-notifications'
import { House, Bell, ArrowsClockwise, GearSix, Microphone } from 'phosphor-react-native'

import HomeScreen      from './src/screens/HomeScreen'
import NudgesScreen    from './src/screens/NudgesScreen'
import HabitsScreen    from './src/screens/HabitsScreen'
import SettingsScreen  from './src/screens/SettingsScreen'
import VoiceDumpScreen from './src/screens/VoiceDumpScreen'
import { colors }      from './src/theme'

// Show notifications even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const Tab   = createBottomTabNavigator()
const Stack = createStackNavigator()

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, border: colors.border, text: colors.foreground, primary: colors.primary }
}

const TAB_ICONS = {
  Today:    House,
  Nudges:   Bell,
  Habits:   ArrowsClockwise,
  Settings: GearSix,
}

function MicTabButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={tabStyles.micWrapper} activeOpacity={0.85}>
      <View style={tabStyles.micBtn}>
        <Microphone size={24} color="#fff" weight="fill" />
      </View>
    </TouchableOpacity>
  )
}

const tabStyles = StyleSheet.create({
  micWrapper: { top: -18, alignItems: 'center', justifyContent: 'center' },
  micBtn:     { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
})

function Tabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle:           { backgroundColor: colors.card, borderTopColor: colors.border, height: 62, paddingBottom: 8 },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle:      { fontSize: 10, fontWeight: '600' },
        tabBarIcon:            ({ color, size }) => {
          const Icon = TAB_ICONS[route.name]
          return Icon ? <Icon size={size - 2} color={color} /> : null
        },
        headerStyle:           { backgroundColor: colors.bg, shadowOpacity: 0, elevation: 0 },
        headerTintColor:       colors.foreground,
      })}>
      <Tab.Screen name="Today"    component={HomeScreen}    options={{ title: 'Today' }} />
      <Tab.Screen name="Nudges"   component={NudgesScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Mic"      component={HomeScreen}
        options={{
          tabBarLabel: () => null,
          tabBarIcon:  () => null,
          tabBarButton: () => <MicTabButton onPress={() => navigation.navigate('VoiceDump')} />,
          headerShown: false,
        }} />
      <Tab.Screen name="Habits"   component={HabitsScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  )
}

// Deep-link config — nudge://voice opens VoiceDump directly (recording auto-starts)
// Samsung Side Key: Settings > Advanced features > Side key > Press OR Double press > Open app > Nudge
const linking = {
  prefixes: ['nudge://'],
  config: { screens: { Main: '', VoiceDump: 'voice' } }
}

export default function App() {
  // Request notification permission on first launch
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={navTheme} linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="VoiceDump" component={VoiceDumpScreen}
            options={{ presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}
