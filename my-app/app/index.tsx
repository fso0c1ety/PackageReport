import React, { useEffect, useState, useRef } from 'react';
import { ToastAndroid, Alert, Platform, View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Type for a report row
type Report = {
  id: string;
  eksportusi: string;
  importusi: string;
  kg: string;
  dataOra: string;
  produkti: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};
import { Ionicons } from '@expo/vector-icons';
import AddReportModal from '../src/components/AddReportModal';
import StatusDropdown from '../src/components/StatusDropdown';
import ConfirmDialog from '../src/components/ConfirmDialog';
import { nowString } from '../src/utils/date';
import { fetchReports, createReport, updateReport, deleteReport as apiDeleteReport } from '../src/api';

export default function HomeScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);


  useEffect(() => {
    (async () => {
      try {
        const data = await fetchReports();
        setReports(data || []);
      } catch (e) {
        setReports([]);
      }
    })();
  }, []);

  const handleAddReport = async (item: Omit<Report, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    try {
      const payload = { ...item, status: 'Ngarkuar', dataOra: item?.dataOra };
      const saved = await createReport(payload);
      setReports((prev) => [saved as Report, ...prev]);
    } catch (e) {
      const fallback = { id: Date.now().toString(), status: 'Ngarkuar', ...item, dataOra: item?.dataOra || nowString(), created_at: nowString(), updated_at: nowString() };
      setReports((prev) => [fallback, ...prev]);
    }
    setModalVisible(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const saved = await updateReport(id, { status });
      setReports((prev) => prev.map((r) => (r.id === id ? (saved as Report) : r)));
      // Show a toast or alert as a local notification
      const message = `Status for report ${id} changed to ${status}`;
      console.log('Notification:', message, 'Platform:', Platform.OS);
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Status Changed', message);
      }
    } catch (e) {
      const ts = nowString();
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status, dataOra: ts } : r)));
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await apiDeleteReport(id);
    } catch (e) {
      // ignore
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const openDeleteConfirm = (id: string) => setConfirmId(id);
  const handleConfirmDelete = () => {
    if (confirmId) deleteReport(confirmId);
    setConfirmId(null);
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell, styles.colEksportusi]}>Eksportusi</Text>
      <Text style={[styles.cell, styles.headerCell, styles.colImportusi]}>Importusi</Text>
      <Text style={[styles.cell, styles.headerCell, styles.colKg]}>KG</Text>
      <Text style={[styles.cell, styles.headerCell, styles.colDataOra]}>Data/Ora</Text>
      <Text style={[styles.cell, styles.headerCell, styles.colProdukti]}>Produkti</Text>
      <Text style={[styles.cell, styles.headerCell, styles.colStatus]}>Status</Text>
      <Text style={[styles.actionCell, styles.headerCell]}>Veprime</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Report }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.colEksportusi]} numberOfLines={1} ellipsizeMode="tail">{item.eksportusi}</Text>
      <Text style={[styles.cell, styles.colImportusi]} numberOfLines={1} ellipsizeMode="tail">{item.importusi}</Text>
      <Text style={[styles.cell, styles.colKg]} numberOfLines={1} ellipsizeMode="tail">{item.kg}</Text>
      <Text style={[styles.cell, styles.colDataOra]}>{item.dataOra}</Text>
      <Text style={[styles.cell, styles.colProdukti]} numberOfLines={1} ellipsizeMode="tail">{item.produkti}</Text>
      <View style={[styles.cell, styles.colStatus]}>
        <StatusDropdown
          value={item.status ?? 'Ngarkuar'}
          onChange={(value: string) => updateStatus(item.id, value)}
        />
      </View>
      <View style={styles.actionCell}>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => openDeleteConfirm(item.id)}>
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Package Raport</Text>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>Empty page. Tap + to add columns.</Text>
          </View>
        ) : (
          <View style={Platform.OS === 'web' ? styles.webTableWrapper : undefined}>
            <ScrollView
              horizontal={Platform.OS !== 'web'}
              style={styles.horizontalScroll}
              contentContainerStyle={Platform.OS === 'web' ? styles.webTableContent : { minWidth: 700 }}
            >
              <View style={Platform.OS === 'web' ? styles.webTable : styles.table}>
                {renderHeader()}
                <FlatList
                  data={reports}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  contentContainerStyle={{ paddingBottom: 80 }}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </ScrollView>
          </View>
        )}
        <AddReportModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleAddReport}
        />
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
        <ConfirmDialog
          visible={!!confirmId}
          title="Fshij kolonën?"
          message="Kjo veprim do të fshijë përgjithmonë këtë rresht."
          onCancel={() => setConfirmId(null)}
          onConfirm={handleConfirmDelete}
        />
      </View>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, textAlign: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 8, color: '#666', fontSize: 16 },
  horizontalScroll: { flexGrow: 0 },
  table: { flex: 1, minWidth: 700, paddingHorizontal: 8, paddingBottom: 12 },
  // Web-specific wrappers for centering and full width
  webTableWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  webTableContent: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
  },
  webTable: {
    width: '100%',
    maxWidth: 1200,
    minWidth: 700,
    paddingHorizontal: 8,
    paddingBottom: 12,
    alignSelf: 'center',
  },
  headerRow: { backgroundColor: '#f2f2f2' },
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingVertical: 10, paddingHorizontal: 2 },
  cell: { fontSize: 14, paddingHorizontal: 4, minWidth: 90, maxWidth: 180, flex: 1, flexShrink: 1 },
  headerCell: { fontWeight: '700', fontSize: 15 },
  actionCell: { width: 70, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  deleteBtn: { backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#0b6efd',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  // Responsive column widths
  colEksportusi: { minWidth: 110, maxWidth: 180 },
  colImportusi: { minWidth: 110, maxWidth: 180 },
  colKg: { minWidth: 60, maxWidth: 90, textAlign: 'center' },
  colDataOra: { minWidth: 120, maxWidth: 260 },
  colProdukti: { minWidth: 110, maxWidth: 180 },
  colStatus: { minWidth: 90, maxWidth: 120 },
});
