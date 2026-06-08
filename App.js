import React from 'react'
import { StatusBar, TouchableOpacity } from 'react-native'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Feather } from '@expo/vector-icons'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import HomeScreen      from './src/screens/HomeScreen'
import NudgesScreen    from './src/screens/NudgesScreen'
import HabitsScreen    from './src/screens/HabitsScreen'
import SettingsScreen  from './src/screens/SettingsScreen'
import VoiceDumpScreen from './src/screens/VoiceDumpScreen'
import { colors }      from './src/theme'

const Tab   = createBottomTabNavigator()
const Stack = createStackNavigator()

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, border: colors.border, text: colors.foreground, primary: colors.primary }
}

const TAB_ICONS = { Today: 'home', Nudges: 'bell', Habits: 'repeat', Settings: 'settings' }

function Tabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle:           { backgroundColor: colors.card, borderTopColor: colors.border, height: 62, paddingBottom: 8 },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle:      { fontSize: 10, fontWeight: '600' },
        tabBarIcon:            ({ color, size }) => <Feather name={TAB_ICONS[route.name]} size={size - 2} color={color} />,
        headerStyle:           { backgroundColor: colors.bg, shadowOpacity: 0, elevation: 0 },
        headerTintColor:       colors.foreground,
        headerRight:           () => (
          <TouchableOpacity onPress={() => navigation.navigate('VoiceDump')}
            style={{ marginRight: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="mic" size={16} color="#fff" />
          </TouchableOpacity>
        ),
      })}>
      <Tab.Screen name="Today"    component={HomeScreen}    options={{ title: 'Today' }} />
      <Tab.Screen name="Nudges"   component={NudgesScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Habits"   component={HabitsScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  )
}

// Deep-link config — nudge://voice opens VoiceDump directly
// Samsung Side Key: Settings > Advanced features > Side key > Double press > Open app > Nudge
const linking = {
  prefixes: ['nudge://'],
  config: { screens: { Main: '', VoiceDump: 'voice' } }
}

export default function App() {
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
