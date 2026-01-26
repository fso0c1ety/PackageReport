import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { nowString } from '../utils/date';

export default function AddReportModal({ visible, onClose, onSubmit }) {
  const [eksportusi, setEksportusi] = useState('');
  const [importusi, setImportusi] = useState('');
  const [kg, setKg] = useState('');
  const [dataOra, setDataOra] = useState(nowString());
  const [userEditedTime, setUserEditedTime] = useState(false);
  const timerRef = useRef(null);
  const [produkti, setProdukti] = useState('');

  const reset = () => {
    setEksportusi('');
    setImportusi('');
    setKg('');
    setDataOra(nowString());
    setUserEditedTime(false);
    setProdukti('');
  };

  const handleSubmit = () => {
    if (!eksportusi && !importusi && !kg && !dataOra && !produkti) return;
    onSubmit({ eksportusi, importusi, kg, dataOra, produkti });
    reset();
  };

  useEffect(() => {
    if (visible && !userEditedTime) {
      timerRef.current = setInterval(() => {
        setDataOra(nowString());
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, userEditedTime]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Columns</Text>

          <TextInput
            style={styles.input}
            placeholder="Eksportusi"
            value={eksportusi}
            onChangeText={setEksportusi}
          />

          <TextInput
            style={styles.input}
            placeholder="Importusi"
            value={importusi}
            onChangeText={setImportusi}
          />

          <TextInput
            style={styles.input}
            placeholder="KG"
            keyboardType="numeric"
            value={kg}
            onChangeText={setKg}
          />

          <TextInput
            style={styles.input}
            placeholder="Data/Ora"
            value={dataOra}
            onChangeText={(t) => {
              setUserEditedTime(true);
              setDataOra(t);
            }}
          />

          <TextInput
            style={styles.input}
            placeholder="Produkti"
            value={produkti}
            onChangeText={setProdukti}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.save]} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '92%', backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 5 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  cancel: { backgroundColor: '#eee' },
  save: { backgroundColor: '#0b6efd' },
  buttonText: { color: '#000' },
});
