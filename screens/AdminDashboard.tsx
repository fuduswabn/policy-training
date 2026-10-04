import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import { useAuth } from '../lib/auth-context';
import PaymentVerificationScreen from './admin/PaymentVerificationScreen';
import { colors, spacing, radius, typography } from '../lib/theme';

export default function AdminDashboard() {
  const { signOut, user } = useAuth();
  
  // Check admin authorization
  const adminCheck = useQuery(api.admin.verifyAdminAccess, user?.userId ? { userId: user.userId as any } : 'skip');
  
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'support' | 'payments' | 'settings'>('overview');

  const companies = useQuery(api.users.getAllCompanies, user?.userId ? { userId: user.userId as any } : 'skip');
  const supportMessages = useQuery(api.support.listMessages, {});
  const replyToMessage = useMutation(api.support.replyToMessage);
  const closeMessage = useMutation(api.support.closeMessage);

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('all');
}