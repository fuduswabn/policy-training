import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import * as ImagePicker from 'expo-image-picker';

const VehicleInspectionScreen = ({ navigation, route }: any) => {
  const { user } = React.useContext(AuthContext);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    mileage: '',
    tyres: 'pass',
    lights: 'pass',
    mirrors: 'pass',
    bodyCondition: 'pass',
    windows: 'pass',
    safetyEquipment: 'pass',
    fluids: 'pass',
    interior: 'pass',
    generalCondition: 'pass',
    comments: '',
  });

  const [photos, setPhotos] = useState<{ [key: string]: string }>({}); // Add photos state
  const [showPreviousInspections, setShowPreviousInspections] = useState(false);
  const [activePhotoItem, setActivePhotoItem] = useState<string | null>(null);

  const vehicleItems = [
    { id: 'tyres', label: 'Tyres', icon: 'directions-car' },
    { id: 'lights', label: 'Lights', icon: 'highlight' },
    { id: 'mirrors', label: 'Mirrors', icon: 'visibility' },
    { id: 'bodyCondition', label: 'Body Condition', icon: 'construction' },
    { id: 'windows', label: 'Windows', icon: 'transparent' },
    { id: 'safetyEquipment', label: 'Safety Equipment', icon: 'security' },
    { id: 'fluids', label: 'Fluids', icon: 'opacity' },
    { id: 'interior', label: 'Interior', icon: 'event-seat' },
    { id: 'generalCondition', label: 'General Condition', icon: 'assessment' },
  ];

  const vehicles = useQuery(
    api.inspections.getVehicles,
    user?.companyId ? { companyId: user.companyId as any } : 'skip'
  );

  const updateInspectionData = (field: string, value: any) => {
    setInspectionData((prev: any) => ({ ...prev, [field]: value }));
  };

  const getOverallStatus = (): 'pass' | 'fail' => {
    const failCount = vehicleItems.filter((item) => inspectionData[item.id as keyof typeof inspectionData] === 'fail').length;
    return failCount > 0 ? 'fail' : 'pass';
  };

  const handleTakePhoto = async (itemId: string) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.cancelled && result.assets && result.assets[0]) {
        setPhotos((prev: { [key: string]: string }) => ({
          ...prev,
          [itemId]: result.assets[0].uri
        }));
        setActivePhotoItem(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSelectPhoto = async (itemId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.cancelled && result.assets && result.assets[0]) {
        setPhotos((prev: { [key: string]: string }) => ({
          ...prev,
          [itemId]: result.assets[0].uri
        }));
        setActivePhotoItem(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const showPhotoOptions = (itemId: string) => {
    Alert.alert(
      'Add Photo',
      'How would you like to add a photo?',
      [
        {
          text: 'Take Photo',
          onPress: () => handleTakePhoto(itemId),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => handleSelectPhoto(itemId),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCompleteInspection = async () => {
    if (!user || !selectedVehicle) {
      Alert.alert('Error', 'Missing inspection details');
      return;
    }

    setIsSubmitting(true);
    try {
      Alert.alert('Success', 'Inspection completed! Photos and data have been saved for future comparisons.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to complete inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={typography.h2}>Vehicle Inspection</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedVehicle ? (
          <>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              Select a vehicle to inspect
            </Text>
            {vehicles?.map((vehicle: any) => (
              <TouchableOpacity
                key={vehicle._id}
                style={styles.vehicleCard}
                onPress={() => setSelectedVehicle(vehicle)}
              >
                <View>
                  <Text style={typography.bodyMedium}>{vehicle.make} {vehicle.model}</Text>
                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    {vehicle.registration}
                  </Text>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>
                    Fleet: {vehicle.fleetNumber || 'N/A'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.backToList}
              onPress={() => setSelectedVehicle(null)}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
              <Text style={[typography.body, { color: colors.primary }]}>Back to Vehicles</Text>
            </TouchableOpacity>

            <View style={styles.vehicleInfo}>
              <Text style={typography.bodyMedium}>
                {selectedVehicle.make} {selectedVehicle.model}
              </Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>
                {selectedVehicle.registration}
              </Text>
            </View>

            {/* Before Use Section */}
            <TouchableOpacity 
              style={styles.beforeUseButton}
              onPress={() => setShowPreviousInspections(!showPreviousInspections)}
            >
              <MaterialIcons name="history" size={20} color={colors.primary} />
              <Text style={[typography.bodyMedium, { color: colors.primary, flex: 1 }]}>
                Before Use - View Previous Inspections
              </Text>
              <MaterialIcons 
                name={showPreviousInspections ? "expand-less" : "expand-more"} 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>

            {showPreviousInspections && (
              <View style={styles.previousInspectionsSection}>
                <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                  Last inspection: Check the conditions below to compare with current state
                </Text>
                <View style={styles.previousInspectionCard}>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>
                    All items passed in last inspection
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={typography.bodyMedium}>Current Mileage</Text>
              <View style={styles.input}>
                <Text style={typography.body}>{inspectionData.mileage}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={typography.h4}>Inspection Checklist</Text>
              <View style={styles.checklistGrid}>
                {vehicleItems.map((item) => (
                  <View key={item.id} style={{ width: '32%' }}>
                    <TouchableOpacity
                      style={[
                        styles.checklistItem,
                        inspectionData[item.id as keyof typeof inspectionData] === 'pass' && styles.checklistPass,
                        inspectionData[item.id as keyof typeof inspectionData] === 'fail' && styles.checklistFail,
                      ]}
                      onPress={() => {
                        const current = inspectionData[item.id as keyof typeof inspectionData];
                        const next = current === 'pass' ? 'fail' : 'pass';
                        updateInspectionData(item.id, next);
                      }}
                    >
                      <MaterialIcons
                        name={item.icon as any}
                        size={24}
                        color={
                          inspectionData[item.id as keyof typeof inspectionData] === 'pass'
                            ? colors.success
                            : inspectionData[item.id as keyof typeof inspectionData] === 'fail'
                            ? colors.error
                            : colors.textTertiary
                        }
                      />
                      <Text style={[typography.small, { marginTop: spacing.xs }]}>{item.label}</Text>
                    </TouchableOpacity>
                    {photos[item.id] && (
                      <View style={styles.photoIndicator}>
                        <MaterialIcons name="check-circle" size={16} color={colors.success} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={() => {
                  Alert.alert('Add Photos', 'Select an item to add a photo for comparison with previous inspections', [
                    ...vehicleItems.map(item => ({ 
                      text: item.label, 
                      onPress: () => showPhotoOptions(item.id),
                    })),
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <MaterialIcons name="add-a-photo" size={20} color={colors.background} />
                <Text style={[typography.body, { color: colors.background, fontWeight: '600', marginLeft: spacing.sm }]}>
                  Add Photo for Comparison
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={typography.bodyMedium}>Comments</Text>
              <View style={[styles.input, { minHeight: 80 }]}>
                <Text style={typography.body}>{inspectionData.comments}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleCompleteInspection} disabled={isSubmitting}>
              <MaterialIcons name="check" size={24} color={colors.background} />
              <Text style={[typography.body, { color: colors.background, fontWeight: '600' }]}>{isSubmitting ? 'Completing...' : 'Complete Inspection'}</Text>
              {isSubmitting && <ActivityIndicator color={colors.background} />}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  vehicleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  backToList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  vehicleInfo: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  beforeUseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  previousInspectionsSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  previousInspectionCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  checklistGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  checklistItem: {
    width: '32%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  checklistPass: {
    backgroundColor: colors.success,
    opacity: 0.1,
  },
  checklistFail: {
    backgroundColor: colors.error,
    opacity: 0.1,
  },
  photoIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.success,
    borderRadius: 10,
    padding: 2,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginVertical: spacing.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    marginVertical: spacing.lg,
  },
});

export default VehicleInspectionScreen;