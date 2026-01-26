import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OPTIONS = ['Ngarkuar', 'Nisur', 'Arritur'];

export default function StatusDropdown({ value = 'Ngarkuar', onChange }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const btnRef = useRef(null);

  const requestSelect = (val) => {
    setPending(val);
    setConfirmOpen(true);
  };

  const confirm = () => {
    if (pending) {
      onChange?.(pending);
    }
    setConfirmOpen(false);
    setOpen(false);
    setPending(null);
  };

  const cancel = () => {
    setConfirmOpen(false);
    setPending(null);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={btnRef}
        style={styles.button}
        onPress={() => {
          if (btnRef.current) {
            btnRef.current.measureInWindow((x, y, width, height) => {
              setMenuPos({ x, y, width, height });
              setOpen((o) => !o);
            });
          } else {
            setOpen((o) => !o);
          }
        }}
      >
        <Text style={styles.buttonText}>{value}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#222" />
      </TouchableOpacity>

      {/* Use Modal for dropdown menu to avoid being cut off */}
      {open && (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View style={StyleSheet.flatten([
            styles.dropdownOverlay,
            { backgroundColor: 'rgba(0,0,0,0.01)' },
          ])}>
            <View
              style={[
                styles.menuModalBox,
                {
                  position: 'absolute',
                  left: menuPos.x,
                  top: menuPos.y + menuPos.height,
                  width: menuPos.width || 180,
                },
              ]}
            >
              <ScrollView style={styles.menuScroll} contentContainerStyle={{ flexGrow: 1 }}>
                {OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={styles.menuItem} onPress={() => { setOpen(false); requestSelect(opt); }}>
                    <Text style={[styles.menuText, value === opt && styles.active]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={cancel}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Ndrysho statusin?</Text>
            <Text style={styles.subtitle}>Konfirmo ndryshimin në: {pending}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={cancel}>
                <Text style={styles.btnText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.confirm]} onPress={confirm}>
                <Text style={[styles.btnText, styles.confirmText]}>Konfirmo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  buttonText: { color: '#222', fontSize: 14 },
  // Old menu style kept for reference
  menu: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 160,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 1000,
    maxHeight: 200,
  },
  dropdownOverlay: {
    flex: 1,
  },
  menuModalBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    maxHeight: 220,
  },
  menuScroll: {
    maxHeight: 220,
  },
  menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { fontSize: 14, color: '#333' },
  active: { fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { marginTop: 6, color: '#444' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  cancel: { backgroundColor: '#eee' },
  confirm: { backgroundColor: '#0b6efd' },
  btnText: { color: '#222' },
  confirmText: { color: '#fff', fontWeight: '600' },
});
