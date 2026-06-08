import React, { useEffect, useState } from 'react'
import { StatusBar, TouchableOpacity, View, StyleSheet, Linking } from 'react-native'
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
import { RecorderContext }  from './src/hooks/useRecorder'
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

const TAB_ICONS = { Today: House, Nudges: Bell, Habits: ArrowsClockwise, Settings: GearSix }

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

function Tabs({ openVoice }) {
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
          tabBarLabel:  () => null,
          tabBarIcon:   () => null,
          tabBarButton: () => <MicTabButton onPress={openVoice} />,
          headerShown:  false,
        }} />
      <Tab.Screen name="Habits"   component={HabitsScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  )
}

export default function App() {
  const [recVisible,  setRecVisible]  = useState(false)
  const [recTextMode, setRecTextMode] = useState(false)

  const openVoice = () => { setRecTextMode(false); setRecVisible(true) }
  const openText  = () => { setRecTextMode(true);  setRecVisible(true) }
  const closeRec  = () => setRecVisible(false)

  // Request notification permission on first launch
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {})
  }, [])

  // Deep link: nudge://voice → open voice sheet
  useEffect(() => {
    const handleUrl = ({ url }) => { if (url?.includes('voice')) openVoice() }
    Linking.getInitialURL().then(url => { if (url?.includes('voice')) openVoice() }).catch(() => {})
    const sub = Linking.addEventListener('url', handleUrl)
    return () => sub.remove()
  }, [])

  return (
    <RecorderContext.Provider value={{ openVoice, openText }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="Main">
              {() => <Tabs openVoice={openVoice} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>

        {/* Recording bottom sheet — lives outside navigation so it's a true overlay */}
        <VoiceDumpScreen
          visible={recVisible}
          textMode={recTextMode}
          onClose={closeRec}
        />
      </GestureHandlerRootView>
    </RecorderContext.Provider>
  )
}
