import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function AddEmployeeScreen({ navigation }: { navigation: any }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider missing');
  const { user } = auth;

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobPosition, setJobPosition] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [employmentType, setEmploymentType] = useState<'full_time' | 'part_time' | 'contract' | 'temporary'>('full_time');
  const [loading, setLoading] = useState(false);

  const departments = useQuery(
    api.hr.getDepartments,
    user?.companyId
      ? {
          companyId: user.companyId as any,
          userId: user.userId as any,
        }
      : 'skip'
  );

  const sites = useQuery(
    api.hr.getSites,
    user?.companyId
      ? {
          companyId: user.companyId as any,
          userId: user.userId as any,
        }
      : 'skip'
  );

  const createEmployee = useMutation(api.users.createEmployee);
  const createProfile = useMutation(api.hr.createEmployeeProfile);

  const handleAddEmployee = async () => {
    if (!email || !fullName) {
      Alert.alert('Error', 'Please fill in email and full name');
      return;
    }

    setLoading(true);
    try {
      // Create user with role employee
      const newUser = await createEmployee({
        companyId: user?.companyId as any,
        email,
        fullName,
        role: 'employee',
      });

      // Create employee profile
      if (newUser?.userId) {
        await createProfile({
          userId: newUser.userId as any,
          companyId: user?.companyId as any,
          departmentId: selectedDept as any,
          siteId: selectedSite as any,
          jobPosition: jobPosition || undefined,
          employmentType,
          createdBy: user?.userId as any,
        });
      }

      Alert.alert('Success', 'Employee added successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Add Employee
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
              Email Address
            </Text>
            <TextInput
              style={styles.input}
              placeholder="employee@company.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Full Name */}
          <View style={styles.formGroup}>
            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
              Full Name
            </Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={colors.textTertiary}
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
          </View>

          {/* Job Position */}
          <View style={styles.formGroup}>
            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
              Job Position
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Manager, Analyst"
              placeholderTextColor={colors.textTertiary}
              value={jobPosition}
              onChangeText={setJobPosition}
              editable={!loading}
            />
          </View>

          {/* Department */}
          <View style={styles.formGroup}>
            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
              Department
            </Text>
            {departments ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.selectGrid}
              >
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept._id}
                    style={[
                      styles.selectItem,
                      selectedDept === dept._id && styles.selectItemSelected,
                    ]}
                    onPress={() => setSelectedDept(dept._id)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        typography.small,
                        {
                          color: selectedDept === dept._id ? colors.primary : colors.text,
                        },
                      ]}
                    >
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>

          {/* Site */}
          <View style={styles.formGroup}>
            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
              Site/Location
            </Text>
            {sites ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.selectGrid}
              >
                {sites.map((site) => (
                  <TouchableOpacity
                    key={site._id}
                    style={[
                      styles.selectItem,
                      selectedSite === site._id && styles.selectItemSelected,
                    ]}
                    onPress={() => setSelectedSite(site._id)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        typography.small,
                        {
                          color: selectedSite === site._id ? colors.primary : colors.text,
                        },
                      ]}
                    >
                      {site.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>

          {/* Employment Type */}
          <View style={styles.formGroup}>
            <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>
              Employment Type
            </Text>
            <View style={styles.typeGrid}>
              {(['full_time', 'part_time', 'contract', 'temporary'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    employmentType === type && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setEmploymentType(type)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      typography.small,
                      {
                        color: employmentType === type ? colors.background : colors.text,
                      },
                    ]}
                  >
                    {type.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[typography.body, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleAddEmployee}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[typography.body, { color: colors.background, fontWeight: '600' }]}>
                Add Employee
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  form: {
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  selectItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
});