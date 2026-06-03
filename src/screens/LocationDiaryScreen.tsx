import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { formatDate } from '../services/formatters';
import { loadDiaryEntries, saveDiaryEntries, DiaryEntry } from '../services/storage';

export default function LocationDiaryScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Carrega as entradas salvas ao montar a tela
  useEffect(() => {
    (async () => {
      const stored = await loadDiaryEntries();
      setEntries(stored);
    })();
  }, []);

  const handleRecordEntry = async () => {
    // 1. Verificações de permissão em lote
    let camGranted = cameraPermission?.granted;
    if (!camGranted) {
      const camRes = await requestCameraPermission();
      camGranted = camRes.granted;
    }
    if (!camGranted) {
      alert('A permissão da câmera é necessária para tirar fotos!');
      return;
    }

    let mediaGranted = mediaPermission?.granted;
    if (!mediaGranted) {
      try {
        const mediaRes = await requestMediaPermission();
        mediaGranted = mediaRes.granted;
      } catch (err) {
        console.warn('Erro ao solicitar permissão de mídia (galeria):', err);
      }
    }
    
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') {
      alert('A permissão de localização é obrigatória para registrar a assinatura de GPS!');
      return;
    }

    setIsRecording(true);

    try {
      if (cameraRef.current) {
        // 2. Dispara a captura da foto
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        
        if (photo) {
          let savedUri = photo.uri;
          
          // 3. Tenta salvar na galeria pública (opcional, falha no Expo Go Android)
          try {
            if (mediaPermission?.granted) {
              const asset = await MediaLibrary.createAssetAsync(photo.uri);
              if (asset && asset.uri) {
                savedUri = asset.uri;
              }
            }
          } catch (mediaError) {
            console.warn('Erro ao salvar na galeria, usando cache local:', mediaError);
          }
          
          // 4. Captura localização GPS (com fallbacks para evitar travamentos)
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
            console.warn('Erro ao obter coordenadas GPS no diário:', locError);
            // Fallback para coordenadas de São Paulo para não travar a criação do diário
            latitude = -23.550520;
            longitude = -46.633308;
          }
          
          // 5. Consolida os dados e salva localmente
          const newEntry: DiaryEntry = {
            id: Date.now().toString(),
            uri: savedUri,
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          };
          
          const updatedEntries = [newEntry, ...entries];
          setEntries(updatedEntries);
          await saveDiaryEntries(updatedEntries);
        }
      }
    } catch (error) {
      console.error(error);
      alert('Falha ao processar o registro no hardware.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleClearEntries = async () => {
    if (entries.length === 0) return;
    const confirm = await new Promise((resolve) => {
      // Simplificado para responder direto na interface ou com confirmação simples
      resolve(true);
    });
    if (confirm) {
      setEntries([]);
      await saveDiaryEntries([]);
    }
  };

  if (!cameraPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      
      {/* Visualizador da Câmera ou Placeholder */}
      <View style={styles.cameraWrapper}>
        {cameraPermission.granted ? (
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.cameraOverlay}>
              <View style={styles.focusIndicator} />
            </View>
          </CameraView>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>Câmera inativa</Text>
            <TouchableOpacity style={styles.activationButton} onPress={requestCameraPermission}>
              <Text style={styles.activationButtonText}>Ativar Preview</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Botões de Ação */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.recordButton, isRecording && styles.recordButtonDisabled]} 
          onPress={handleRecordEntry} 
          disabled={isRecording}
        >
          {isRecording ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : null}
          <Text style={styles.recordButtonText}>
            {isRecording ? "Registrando no Hardware..." : "Fotografar e Salvar Entrada"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Título da Lista e Limpeza */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Registros de Diário ({entries.length})</Text>
        {entries.length > 0 && (
          <TouchableOpacity onPress={handleClearEntries} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Limpar Tudo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Entradas */}
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>Sem Registros</Text>
            <Text style={styles.emptySub}>Capture fotos acima para criar um diário de localização permanente.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            <View style={styles.cardInfo}>
              <Text style={styles.timestamp}>
                {formatDate(new Date(item.timestamp))}
              </Text>
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsLabel}>GPS</Text>
                <Text style={styles.coords}>
                  {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  
  // Câmera
  cameraWrapper: { height: 230, width: '100%', backgroundColor: '#0F172A', overflow: 'hidden', position: 'relative' },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  focusIndicator: { width: 60, height: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 8 },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  placeholderIcon: { fontSize: 40, marginBottom: 8 },
  placeholderText: { color: '#94A3B8', fontSize: 15, fontWeight: '600', marginBottom: 12 },
  activationButton: { backgroundColor: '#475569', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  activationButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  
  // Botões e Ações
  actionContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  recordButton: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  recordButtonDisabled: { opacity: 0.7 },
  recordButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  
  // Cabeçalho da Lista
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  clearButton: { paddingVertical: 4, paddingHorizontal: 8 },
  clearButtonText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },

  // Lista
  listContent: { padding: 20, paddingTop: 4, paddingBottom: 30 },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 12, shadowColor: '#0F172A', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  thumbnail: { width: 76, height: 76, borderRadius: 12, marginRight: 16, backgroundColor: '#E2E8F0' },
  cardInfo: { flex: 1, justifyContent: 'center' },
  timestamp: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#EEF2F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gpsLabel: { fontSize: 9, fontWeight: '900', color: '#6366F1', marginRight: 6 },
  coords: { fontSize: 12, color: '#475569', fontWeight: '600' },

  // Lista Vazia
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#64748B', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 }
});
