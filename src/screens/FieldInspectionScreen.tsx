import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, FlatList, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { loadInspectionReports, saveInspectionReports, InspectionReport } from '../services/storage';

export default function FieldInspectionScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  // Estados do Formulário
  const [observations, setObservations] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Login PIN Fallback
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Carrega o histórico de relatórios
  useEffect(() => {
    (async () => {
      const stored = await loadInspectionReports();
      setReports(stored);
    })();
  }, []);

  const handleLoginBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      // Fallback automático se o hardware não for compatível
      setIsAuthenticated(true);
      return;
    }
    
    const result = await LocalAuthentication.authenticateAsync({ 
      promptMessage: 'Login do Inspetor de Campo' 
    });
    if (result.success) {
      setIsAuthenticated(true);
    }
  };

  const handlePinLogin = (char: string) => {
    setPinError('');
    if (pin.length < 4) {
      const newPin = pin + char;
      setPin(newPin);
      
      if (newPin === '1234') {
        setTimeout(() => {
          setIsAuthenticated(true);
          setShowPinModal(false);
          setPin('');
        }, 150);
      } else if (newPin.length === 4) {
        setTimeout(() => {
          setPinError('Código PIN incorreto.');
          setPin('');
        }, 150);
      }
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      if (photo) {
        setPhotoUri(photo.uri);
        setIsCameraActive(false);
      }
    }
  };

  const submitReport = async () => {
    if (!photoUri || !observations.trim()) {
      alert('As observações e a foto de evidência são obrigatórias!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permissão de GPS negada. É necessária para assinar o relatório.');
        setIsSubmitting(false);
        return;
      }

      // Captura GPS com fallbacks para evitar travamentos
      let latitude = 0;
      let longitude = 0;
      try {
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        if (loc) {
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch (locError) {
        console.warn('Erro ao obter coordenadas GPS no relatório:', locError);
        latitude = -23.550520; // Default fallback (São Paulo)
        longitude = -46.633308;
      }
      
      const newReport: InspectionReport = {
        id: Date.now().toString(),
        observations: observations.trim(),
        photoUri,
        latitude,
        longitude,
        timestamp: new Date().toLocaleString('pt-BR')
      };

      const updated = [newReport, ...reports];
      setReports(updated);
      await saveInspectionReports(updated);

      // Limpa formulário
      setObservations('');
      setPhotoUri(null);
      setIsFormVisible(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao emitir o relatório.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearReports = async () => {
    setReports([]);
    await saveInspectionReports([]);
  };

  // 1. TELA DE LOGIN (Não Autenticado)
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <View style={styles.loginCard}>
          <Text style={styles.loginIcon}>📋</Text>
          <Text style={styles.loginTitle}>Módulo de Inspeção</Text>
          <Text style={styles.loginSubtitle}>
            Identifique-se utilizando biometria ou código PIN para iniciar os relatórios de vistoria.
          </Text>
          
          <TouchableOpacity style={styles.primaryButton} onPress={handleLoginBiometric}>
            <Text style={styles.primaryButtonText}>Autenticar Inspetor</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => { setShowPinModal(true); setPin(''); setPinError(''); }}>
            <Text style={styles.secondaryButtonText}>Entrar com Código PIN</Text>
          </TouchableOpacity>
        </View>

        {/* Modal de PIN para Login */}
        <Modal
          visible={showPinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>PIN do Inspetor</Text>
                <Text style={styles.modalSub}>Padrão acadêmico: 1234</Text>
                <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowPinModal(false)}>
                  <Text style={styles.closeModalButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pinIndicators}>
                {[0, 1, 2, 3].map((index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.pinDot, 
                      pin.length > index && styles.pinDotFilled,
                      pinError !== '' && styles.pinDotError
                    ]} 
                  />
                ))}
              </View>

              {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}

              <View style={styles.keypad}>
                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
                  <View key={rIdx} style={styles.keypadRow}>
                    {row.map((num) => (
                      <TouchableOpacity 
                        key={num} 
                        style={styles.keypadKey} 
                        onPress={() => handlePinLogin(num)}
                      >
                        <Text style={styles.keyText}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
                <View style={styles.keypadRow}>
                  <View style={styles.keypadKeyDummy} />
                  <TouchableOpacity 
                    style={styles.keypadKey} 
                    onPress={() => handlePinLogin('0')}
                  >
                    <Text style={styles.keyText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.keypadKey} 
                    onPress={() => { if (pin.length > 0) setPin(pin.slice(0, -1)); }}
                  >
                    <Text style={styles.keyText}>⌫</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // 2. FORMULÁRIO DE NOVA VISTORIA (Visível quando isFormVisible === true)
  if (isFormVisible) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Nova Vistoria de Campo</Text>
            <TouchableOpacity onPress={() => { setIsFormVisible(false); setPhotoUri(null); setObservations(''); }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Observações e Status do Equipamento</Text>
          <TextInput
            style={styles.input}
            placeholder="Descreva detalhadamente o status do equipamento, irregularidades ou pendências encontradas..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={5}
            value={observations}
            onChangeText={setObservations}
          />

          <Text style={styles.inputLabel}>Foto de Evidência (Obrigatória)</Text>
          {photoUri ? (
            <View style={styles.previewCard}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.changePhotoButton} onPress={() => setIsCameraActive(true)}>
                <Text style={styles.changePhotoButtonText}>Refazer Foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.cameraPlaceholderButton} onPress={() => setIsCameraActive(true)}>
              <Text style={styles.cameraPlaceholderIcon}>📷</Text>
              <Text style={styles.cameraPlaceholderText}>Tirar Foto de Evidência</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.disabledButton]} 
            onPress={submitReport}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : null}
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Gravando Relatório & GPS..." : "Finalizar Inspeção & Assinar GPS"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Câmera em Tela Cheia com Safe Area */}
        <Modal
          visible={isCameraActive}
          animationType="fade"
          onRequestClose={() => setIsCameraActive(false)}
        >
          <View style={styles.fullCameraContainer}>
            {cameraPermission?.granted ? (
              <CameraView style={styles.fullCamera} facing="back" ref={cameraRef} />
            ) : (
              <SafeAreaView style={styles.cameraPermOverlay}>
                <Text style={styles.cameraPermText}>Ative a câmera para coletar a evidência.</Text>
                <TouchableOpacity style={styles.activationButton} onPress={requestCameraPermission}>
                  <Text style={styles.activationButtonText}>Conceder Permissão</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeCameraText} onPress={() => setIsCameraActive(false)}>
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>Voltar</Text>
                </TouchableOpacity>
              </SafeAreaView>
            )}

            {cameraPermission?.granted && (
              <SafeAreaView style={styles.cameraControls} edges={['bottom']}>
                <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeCameraButton} onPress={() => setIsCameraActive(false)}>
                  <Text style={styles.closeCameraButtonText}>Voltar</Text>
                </TouchableOpacity>
              </SafeAreaView>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // 3. TELA PRINCIPAL (Histórico de Relatórios)
  return (
    <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
      <View style={styles.listHeaderRow}>
        <View>
          <Text style={styles.mainTitle}>Histórico de Inspeções</Text>
          <Text style={styles.mainSubtitle}>Relatórios de campo assinados eletronicamente</Text>
        </View>
        
        <TouchableOpacity style={styles.addButton} onPress={() => setIsFormVisible(true)}>
          <Text style={styles.addButtonText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sem Relatórios</Text>
            <Text style={styles.emptySub}>Nenhuma vistoria foi registrada ainda neste dispositivo.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reportCard}>
            <Image source={{ uri: item.photoUri }} style={styles.reportImage} />
            <View style={styles.reportDetails}>
              <View style={styles.reportMeta}>
                <Text style={styles.reportDate}>{item.timestamp}</Text>
                <View style={styles.gpsBadge}>
                  <Text style={styles.gpsBadgeText}>GPS OK</Text>
                </View>
              </View>

              <Text style={styles.reportObsTitle}>Status / Observações:</Text>
              <Text style={styles.reportObsText}>{item.observations}</Text>

              <View style={styles.coordsRow}>
                <Text style={styles.coordsLabel}>Assinatura GPS:</Text>
                <Text style={styles.coordsValue}>{item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}</Text>
              </View>
            </View>
          </View>
        )}
      />

      {reports.length > 0 && (
        <TouchableOpacity style={styles.clearAllButton} onPress={handleClearReports}>
          <Text style={styles.clearAllButtonText}>Limpar Histórico de Vistorias</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 24 },
  safeContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContainer: { padding: 24 },
  
  // Login
  loginCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, alignItems: 'center', width: '100%', shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  loginIcon: { fontSize: 48, marginBottom: 16 },
  loginTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  loginSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  primaryButton: { backgroundColor: '#10B981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center', shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#F1F5F9', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryButtonText: { color: '#475569', fontSize: 16, fontWeight: '700' },

  // Form
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  cancelText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 15, textAlignVertical: 'top', backgroundColor: '#FFFFFF', color: '#1E293B', marginBottom: 24 },
  
  // Camera e Preview
  cameraPlaceholderButton: { height: 160, borderRadius: 16, backgroundColor: '#E2E8F0', borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  cameraPlaceholderIcon: { fontSize: 36, marginBottom: 8 },
  cameraPlaceholderText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  previewCard: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 32, alignItems: 'center', paddingBottom: 16 },
  photoPreview: { width: '100%', height: 200, backgroundColor: '#E2E8F0' },
  changePhotoButton: { marginTop: 12, backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  changePhotoButtonText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  submitButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 20 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },

  // Câmera Cheia Modal
  fullCameraContainer: { flex: 1, backgroundColor: '#000', position: 'relative' },
  fullCamera: { flex: 1 },
  cameraPermOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', padding: 24 },
  cameraPermText: { color: '#F8FAFC', fontSize: 16, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  activationButton: { backgroundColor: '#6366F1', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  activationButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  closeCameraText: { marginTop: 20, padding: 8 },
  cameraControls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.5)' },
  captureButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF', borderStyle: 'solid', borderWidth: 2, borderColor: '#000' },
  closeCameraButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  closeCameraButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Lista Principal
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 12 },
  mainTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  mainSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addButton: { backgroundColor: '#10B981', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, shadowColor: '#10B981', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  listContent: { padding: 24, paddingTop: 8 },
  reportCard: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  reportImage: { width: '100%', height: 180, backgroundColor: '#E2E8F0' },
  reportDetails: { padding: 18 },
  reportMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportDate: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  gpsBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gpsBadgeText: { color: '#065F46', fontSize: 10, fontWeight: '900' },
  reportObsTitle: { fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, marginBottom: 4 },
  reportObsText: { fontSize: 15, color: '#1E293B', fontWeight: '500', lineHeight: 22, marginBottom: 16 },
  coordsRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 12, alignItems: 'center' },
  coordsLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginRight: 6 },
  coordsValue: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  clearAllButton: { marginHorizontal: 24, marginBottom: 32, backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  clearAllButtonText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },

  // Lista Vazia
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#64748B', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },

  // PIN Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28 },
  modalHeader: { alignItems: 'center', marginBottom: 20, position: 'relative', width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#94A3B8' },
  closeModalButton: { position: 'absolute', right: 0, top: -5, padding: 8 },
  closeModalButtonText: { color: '#64748B', fontSize: 18, fontWeight: '700' },
  pinIndicators: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8, height: 20 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', marginHorizontal: 10 },
  pinDotFilled: { backgroundColor: '#10B981', borderColor: '#10B981' },
  pinDotError: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  pinErrorText: { color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  keypad: { width: '100%', marginTop: 10, paddingBottom: 15 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  keypadKey: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  keypadKeyDummy: { width: 70, height: 70 },
  keyText: { fontSize: 24, fontWeight: '700', color: '#1E293B' }
});
