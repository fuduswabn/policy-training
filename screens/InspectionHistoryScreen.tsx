import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { api } from '../lib/config';

const InspectionHistoryScreen = ({ route, navigation }: any) => {
  const { assetType, vehicleId, assetId } = route.params || {};
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  const history = useQuery(
    api.inspections.getInspectionHistory,
    assetType ? { assetType, vehicleId, assetId } : 'skip'
  );

  // Always call the query, but it will be null/undefined if selectedInspectionId is null
  const selectedDetails = useQuery(
    selectedInspectionId ? api.inspections.getInspection : null,
    selectedInspectionId ? { inspectionId: selectedInspectionId as any } : 'skip'
  );

  if (!assetType) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.lg }]}>
        <MaterialIcons name="history" size={48} color={colors.textTertiary} />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
          No inspection history to show yet.
        </Text>
      </SafeAreaView>
    );
  }

  if (!history) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return colors.success;
      case 'fail':
        return colors.error;
      default:
        return colors.textTertiary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection History</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="history" size={48} color={colors.textTertiary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
              No inspection history yet.
            </Text>
          </View>
        ) : (
          history.map((inspection: any, idx: number) => (
            <TouchableOpacity
              key={inspection._id}
              style={styles.historyCard}
              onPress={() => setSelectedInspectionId(inspection._id)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    {inspection.isBaseline && (
                      <View style={styles.baselineBadge}>
                        <Text style={[typography.small, { color: colors.background }]}>BASELINE</Text>
                      </View>
                    )}
                    <Text style={typography.bodyMedium}>
                      Inspection #{history.length - idx}
                    </Text>
                  </View>
                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    {new Date(inspection.dateTime).toLocaleDateString()} {new Date(inspection.dateTime).toLocaleTimeString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(inspection.overallCondition) },
                  ]}
                >
                  <MaterialIcons
                    name={inspection.overallCondition === 'pass' ? 'check-circle' : 'error'}
                    size={20}
                    color={colors.background}
                  />
                  <Text style={[typography.small, { color: colors.background, marginLeft: spacing.xs }]}>
                    {inspection.overallCondition.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>Status</Text>
                  <Text style={typography.bodyMedium}>{inspection.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedInspectionId && selectedDetails && (
        <View style={styles.detailsPanel}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedInspectionId(null)}
          >
            <MaterialIcons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text style={typography.h3}>Inspection Details</Text>

          <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <Text style={[typography.bodyMedium, { marginBottom: spacing.sm, color: colors.textSecondary }]}>
                Date & Time
              </Text>
              <Text style={typography.body}>
                {new Date(selectedDetails.dateTime).toLocaleString()}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={[typography.bodyMedium, { marginBottom: spacing.sm, color: colors.textSecondary }]}>
                Checklist Items
              </Text>
              {selectedDetails.checklist.map((item: any, idx: number) => (
                <View key={idx} style={styles.checklistItem}>
                  <MaterialIcons
                    name={item.status === 'pass' ? 'check-circle' : item.status === 'fail' ? 'error' : 'remove-circle'}
                    size={16}
                    color={item.status === 'pass' ? colors.success : item.status === 'fail' ? colors.error : colors.textTertiary}
                  />
                  <Text style={[typography.small, { marginLeft: spacing.sm, flex: 1 }]}>{item.item}</Text>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            {selectedDetails.comments && (
              <View style={styles.detailSection}>
                <Text style={[typography.bodyMedium, { marginBottom: spacing.sm, color: colors.textSecondary }]}>
                  Comments
                </Text>
                <Text style={typography.body}>{selectedDetails.comments}</Text>
              </View>
            )}

            {selectedDetails.followUpActionRequired && (
              <View style={[styles.detailSection, { backgroundColor: colors.warning, opacity: 0.1, padding: spacing.md, borderRadius: radius.md }]}>
                <Text style={[typography.bodyMedium, { marginBottom: spacing.sm }]}>
                  ⚠️ Follow-up Action Required
                </Text>
                <Text style={typography.small}>{selectedDetails.followUpNotes}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  baselineBadge: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusItem: {
    flex: 1,
  },
  detailsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: '75%',
    zIndex: 100,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  detailsScroll: {
    marginTop: spacing.md,
  },
  detailSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});

export default InspectionHistoryScreen;