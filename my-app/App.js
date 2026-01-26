import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AddReportModal from './src/components/AddReportModal';
import StatusDropdown from './src/components/StatusDropdown';
import ConfirmDialog from './src/components/ConfirmDialog';
import { nowString } from './src/utils/date';
import { fetchReports, createReport, updateReport, deleteReport as apiDeleteReport } from './src/api';

export default function App() {
  const [reports, setReports] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

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

  const handleAddReport = async (item) => {
    try {
      const payload = { ...item, status: 'Ngarkuar', dataOra: item?.dataOra };
      const saved = await createReport(payload);
      setReports((prev) => [saved, ...prev]);
    } catch (e) {
      const fallback = { id: Date.now().toString(), status: 'Ngarkuar', ...item, dataOra: item?.dataOra || nowString(), created_at: nowString(), updated_at: nowString() };
      setReports((prev) => [fallback, ...prev]);
    }
    setModalVisible(false);
  };

  const updateStatus = async (id, status) => {
    try {
      const saved = await updateReport(id, { status });
      setReports((prev) => prev.map((r) => (r.id === id ? saved : r)));
    } catch (e) {
      const ts = nowString();
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status, dataOra: ts } : r)));
    }
  };

  const deleteReport = async (id) => {
    try {
      await apiDeleteReport(id);
    } catch (e) {
      // ignore
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const openDeleteConfirm = (id) => setConfirmId(id);
  const handleConfirmDelete = () => {
    if (confirmId) deleteReport(confirmId);
    setConfirmId(null);
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell]}>Eksportusi</Text>
      <Text style={[styles.cell, styles.headerCell]}>Importusi</Text>
      <Text style={[styles.cell, styles.headerCell]}>KG</Text>
      <Text style={[styles.cell, styles.headerCell]}>Data/Ora</Text>
      <Text style={[styles.cell, styles.headerCell]}>Produkti</Text>
      <Text style={[styles.cell, styles.headerCell]}>Status</Text>
      <Text style={[styles.actionCell, styles.headerCell]}>Veprime</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.eksportusi}</Text>
      <Text style={styles.cell}>{item.importusi}</Text>
      <Text style={styles.cell}>{item.kg}</Text>
      <Text style={styles.cell}>{item.dataOra}</Text>
      <Text style={styles.cell}>{item.produkti}</Text>
      <View style={styles.cell}>
        <StatusDropdown
          value={item.status ?? 'Ngarkuar'}
          onChange={(value) => updateStatus(item.id, value)}
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
      <StatusBar style="dark" />
      <Text style={styles.title}>Package Raport</Text>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#999" />
          <Text style={styles.emptyText}>Empty page. Tap + to add columns.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          {renderHeader()}
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 8, color: '#666' },
  table: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
  headerRow: { backgroundColor: '#f2f2f2' },
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingVertical: 10, paddingHorizontal: 6 },
  cell: { flex: 1, fontSize: 14, paddingHorizontal: 4 },
  headerCell: { fontWeight: '700' },
  actionCell: { width: 70, alignItems: 'center', justifyContent: 'center' },
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
});
