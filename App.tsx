import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, ActivityIndicator, View, useWindowDimensions, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { MaterialIcons } from '@expo/vector-icons';
import { lazy, Suspense, useContext, Component } from 'react';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { useQuery } from 'convex/react';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import ManagerDashboard from './screens/ManagerDashboard';
import PolicyChatScreen from './screens/PolicyChatScreen';
import QuizScreen from './screens/QuizScreen';
import ComplianceScreen from './screens/ComplianceScreen';
import WellnessChatScreen from './screens/WellnessChatScreen';
import ConflictResolutionScreen from './screens/ConflictResolutionScreen';
import MyLearningScreen from './screens/MyLearningScreen';
import MyInspectionsScreen from './screens/MyInspectionsScreen';
import HRComplianceDashboard from './screens/HRComplianceDashboard';

const ForgotPasswordScreen = lazy(() => import("./screens/ForgotPasswordScreen"));
const ProfessionalsManagementScreen = lazy(() => import("./screens/ProfessionalsManagementScreen"));
const DocumentUploadScreen = lazy(() => import("./screens/DocumentUploadScreen"));
const PaywallScreen = lazy(() => import("./screens/PaywallScreen"));
const EFTPaymentScreen = lazy(() => import("./screens/EFTPaymentScreen"));
const PackageManagementScreen = lazy(() => import("./screens/PackageManagementScreen"));
const SiteListScreen = lazy(() => import("./screens/SiteListScreen"));

import { AuthProvider, AuthContext } from './lib/auth-context';
import { BrandingProvider, useBranding } from './lib/branding-context';
import { colors, spacing, radius, typography } from './lib/theme';
import { api } from './lib/config';
import type { Id } from './lib/config';
import { ScrollableTabBar } from './lib/ScrollableTabBar';

const InspectionTemplatesScreen = lazy(() => import("./screens/InspectionTemplatesScreen"));
const InspectionChecklistScreen = lazy(() => import("./screens/InspectionChecklistScreen"));
const PhotoComparisonScreen = lazy(() => import("./screens/PhotoComparisonScreen"));
const VehicleInspectionScreen = lazy(() => import("./screens/VehicleInspectionScreen"));
const InspectionHistoryScreen = lazy(() => import("./screens/InspectionHistoryScreen"));
const EmployeeListScreen = lazy(() => import("./screens/EmployeeListScreen"));
const AddEmployeeScreen = lazy(() => import("./screens/AddEmployeeScreen"));
const DepartmentListScreen = lazy(() => import("./screens/DepartmentListScreen"));
const EmployeeComplianceDetailScreen = lazy(() => import("./screens/EmployeeComplianceDetailScreen"));
const DepartmentComplianceDetailScreen = lazy(() => import("./screens/DepartmentComplianceDetailScreen"));
const RequestNewSkillScreen = lazy(() => import("./screens/RequestNewSkillScreen"));
const LearningPlanScreen = lazy(() => import("./screens/LearningPlanScreen"));
const LessonReaderScreen = lazy(() => import("./screens/LessonReaderScreen"));
const InspectionAssignmentScreen = lazy(() => import("./screens/InspectionAssignmentScreen"));
const InspectionEquipmentAssignmentScreen = lazy(() => import("./screens/InspectionEquipmentAssignmentScreen"));

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const tabSceneStyle = { flex: 1 };


function LoadingFallback() {
return (
<View style={styles.loadingContainer}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}


class AppErrorBoundary extends Component<{ children?: any }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <MaterialIcons name="error-outline" size={64} color={colors.error} />
            <Text style={{ ...typography.h3, color: colors.text, textAlign: 'center' }}>
              Something went wrong
            </Text>
            <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}>
              {this.state.error?.message || 'Please reload the app. If it keeps happening, send the screen details to support.'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                void Updates.reloadAsync().catch(() => undefined);
              }}
              style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
            >
              <Text style={{ ...typography.body, color: colors.background, fontWeight: '600' }}>Reload</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children ?? null;
  }
}

function EmployeeTabs() {
  const { features } = useBranding();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // On small screens, hide labels when there are many tabs to prevent overflow
  const showLabels = isTablet || width >= 500;

  return (
    <Tab.Navigator
      screenOptions={(_props: any) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBar: (tabProps: any) => (
          <ScrollableTabBar
            {...tabProps}
            isTablet={isTablet}
            showLabels={showLabels}
          />
        ),
        sceneContainerStyle: tabSceneStyle,
      } as any)}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
          tabBarLabel: showLabels ? 'Home' : undefined,
        }}
      />
      <Tab.Screen
        name="MyInspections"
        component={MyInspectionsScreen}
        options={{
          tabBarLabel: showLabels ? 'Inspections' : undefined,
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="checklist" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={PolicyChatScreen}
        options={{
          tabBarLabel: showLabels ? 'Chat' : undefined,
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="chat" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wellness"
        component={WellnessChatScreen}
        options={{
          tabBarLabel: showLabels ? 'Wellness' : undefined,
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="favorite" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Resolve"
        component={ConflictResolutionScreen}
        options={{
          tabBarLabel: showLabels ? 'Conflicts' : undefined,
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="handshake" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={QuizScreen}
        options={{
          tabBarLabel: showLabels ? 'Quiz' : undefined,
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="quiz" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Compliance"
        component={ComplianceScreen}
        options={{
          tabBarLabel: showLabels ? 'Compliance' : undefined,
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="check-circle" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Learning"
        component={MyLearningScreen}
        options={{
          tabBarLabel: showLabels ? 'Learning' : undefined,
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="school" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  const { features } = useBranding();
  const auth = useContext(AuthContext);
  const companyId = auth?.user?.companyId as Id<'companies'> | undefined;
  const packageInfo = useQuery(api.packages.getCompanyPackageInfo, companyId ? { companyId } : 'skip');
  const packageFeatures = packageInfo?.features ?? [];
  const hasPackageFeature = (feature: string) => packageFeatures.includes(feature);
  const showWellness = features.wellnessEnabled && hasPackageFeature('wellness_chat');
  const showConflicts = features.conflictResolutionEnabled && hasPackageFeature('conflict_resolution');
  const showQuiz = features.quizEnabled && hasPackageFeature('daily_quizzes');
  const showLearning = hasPackageFeature('personal_learning');
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <Tab.Navigator
      screenOptions={(_props: any) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBar: (tabProps: any) => (
          <ScrollableTabBar
            {...tabProps}
            isTablet={isTablet}
            showLabels={true}
          />
        ),
        sceneContainerStyle: tabSceneStyle,
      } as any)}
    >
      <Tab.Screen
        name="Dashboard"
        component={ManagerDashboard}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyInspections"
        component={MyInspectionsScreen}
        options={{
          tabBarLabel: 'Inspections',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="checklist" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={PolicyChatScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="chat" size={24} color={color} />
          ),
        }}
      />
      {showWellness && (
        <Tab.Screen
          name="Wellness"
          component={WellnessChatScreen}
          options={{
            tabBarLabel: 'Wellness',
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialIcons name="favorite" size={24} color={color} />
            ),
          }}
        />
      )}
      {showConflicts && (
        <Tab.Screen
          name="Resolve"
          component={ConflictResolutionScreen}
          options={{
            tabBarLabel: 'Conflicts',
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialIcons name="handshake" size={24} color={color} />
            ),
          }}
        />
      )}
      {showQuiz && (
        <Tab.Screen
          name="Quiz"
          component={QuizScreen}
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialIcons name="quiz" size={24} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Compliance"
        component={ComplianceScreen}
        options={{
          tabBarLabel: 'Compliance',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="check-circle" size={24} color={color} />
          ),
        }}
      />
      {showLearning && (
        <Tab.Screen
          name="Learning"
          component={MyLearningScreen}
          options={{
            tabBarLabel: 'Learning',
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialIcons name="school" size={24} color={color} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <Tab.Navigator
      screenOptions={(_props: any) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBar: (tabProps: any) => (
          <ScrollableTabBar
            {...tabProps}
            isTablet={isTablet}
            showLabels={true}
          />
        ),
        sceneContainerStyle: tabSceneStyle,
      } as any)}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="admin-panel-settings" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HRCompliance"
        component={HRComplianceDashboard}
        options={{
          tabBarLabel: 'Compliance',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="assessment" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={PolicyChatScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="chat" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function DemoBlockedScreen() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('AuthProvider missing');
  }
  const { signOut } = auth;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.loadingContainer}>
      <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, flex: 1, justifyContent: 'center' }}>
        <MaterialIcons name="security" size={80} color={colors.error} />
        <Text style={{ ...typography.h2, color: colors.error, marginTop: spacing.lg, marginBottom: spacing.sm, textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }}>
          Demo accounts cannot access the real admin dashboard. This is a security restriction to keep demo and production data completely separate.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md }}
          onPress={handleSignOut}
        >
          <Text style={{ ...typography.body, color: colors.background, fontWeight: '600' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function RootStack() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('AuthProvider missing');
  }

  const { user } = auth;
  const isPaidManager =
    user?.role === 'manager' &&
    (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial');

  const PaywallRoute = ({ navigation }: { navigation: any }) => (
    <PaywallScreen
      companyId={user?.companyId}
      onClose={() => navigation.goBack()}
    />
  );

  const EFTPaymentRoute = ({ route, navigation }: { route: any; navigation: any }) => (
    <EFTPaymentScreen
      companyId={user?.companyId as any}
      userId={user?.userId as any}
      packagePlan={route?.params?.packagePlan}
      onClose={() => navigation.goBack()}
    />
  );

  if (!user) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
      </View>
    );
  }

  if (user.role === 'admin') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AdminApp">
          <Stack.Screen name="AdminApp" component={AdminTabs} />
          <Stack.Screen name="EmployeeComplianceDetail" component={EmployeeComplianceDetailScreen} />
          <Stack.Screen name="DepartmentComplianceDetail" component={DepartmentComplianceDetailScreen} />
          <Stack.Screen name="Paywall" component={PaywallRoute} />
          <Stack.Screen name="EFTPayment" component={EFTPaymentRoute} />
        </Stack.Navigator>
      </View>
    );
  }

  if (user.role === 'manager') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={isPaidManager ? 'ManagerApp' : 'Paywall'}
        >
          <Stack.Screen name="ManagerApp" component={ManagerTabs} />
          <Stack.Screen name="Paywall" component={PaywallRoute} />
          <Stack.Screen name="EFTPayment" component={EFTPaymentRoute} />
          <Stack.Screen name="ProfessionalsManagement" component={ProfessionalsManagementScreen} />
          <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
          <Stack.Screen name="PackageManagement" component={PackageManagementScreen} />
          <Stack.Screen name="MyLearning" component={MyLearningScreen} />
          <Stack.Screen name="InspectionTemplates" component={InspectionTemplatesScreen} />
          <Stack.Screen name="InspectionAssignment" component={InspectionAssignmentScreen} />
          <Stack.Screen name="InspectionEquipmentAssignment" component={InspectionEquipmentAssignmentScreen} />
          <Stack.Screen name="InspectionChecklist" component={InspectionChecklistScreen} />
          <Stack.Screen name="PhotoComparison" component={PhotoComparisonScreen} />
          <Stack.Screen name="VehicleInspection" component={VehicleInspectionScreen} />
          <Stack.Screen name="InspectionHistory" component={InspectionHistoryScreen} />
          <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
          <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
          <Stack.Screen name="DepartmentList" component={DepartmentListScreen} />
          <Stack.Screen name="SiteList" component={SiteListScreen} />
        </Stack.Navigator>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="EmployeeApp">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MyInspections" component={MyInspectionsScreen} />
        <Stack.Screen name="EmployeeApp" component={EmployeeTabs} />
        <Stack.Screen name="RequestNewSkill" component={RequestNewSkillScreen} />
        <Stack.Screen name="LearningPlan" component={LearningPlanScreen} />
        <Stack.Screen name="LessonReader" component={LessonReaderScreen} />
        <Stack.Screen name="InspectionChecklist" component={InspectionChecklistScreen} />
        <Stack.Screen name="VehicleInspection" component={VehicleInspectionScreen} />
        <Stack.Screen name="Paywall" component={PaywallRoute} />
        <Stack.Screen name="EFTPayment" component={EFTPaymentRoute} />
      </Stack.Navigator>
    </View>
  );
}
export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider style={styles.container}>
        <AuthProvider>
          <NavigationContainer>
            <Suspense fallback={<LoadingFallback />}>
              <BrandingProvider>
                <RootStack />
              </BrandingProvider>
            </Suspense>
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
