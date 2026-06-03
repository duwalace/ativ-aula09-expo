import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

export default function BusinessCardScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const requestLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permissão de localização negada.');
        setIsLocating(false);
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
    } catch (error) {
      setLocationError('Erro ao ler dados do GPS.');
      console.error(error);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  if (!cameraPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // Se a permissão não foi concedida, exibe uma tela amigável explicando o motivo e com botão para solicitar
  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Permissão de Câmera</Text>
          <Text style={styles.permissionText}>
            Precisamos de acesso à sua câmera frontal para poder exibir sua imagem em tempo real no cartão de visitas do aplicativo.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestCameraPermission}>
            <Text style={styles.primaryButtonText}>Permitir Câmera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Container da Câmera (Avatar) */}
        <View style={styles.avatarWrapper}>
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="front" />
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>AO VIVO</Text>
          </View>
        </View>

        {/* Cartão de Identificação Premium */}
        <View style={styles.infoCard}>
          <Text style={styles.roleText}>ESTUDANTE</Text>
          <Text style={styles.name}>Aluno SENAI</Text>
          <Text style={styles.course}>Desenvolvimento de Sistemas</Text>
          
          <View style={styles.divider} />

          {/* Seção de GPS */}
          <View style={styles.locationSection}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>Coordenadas GPS (Hardware)</Text>
              {isLocating && <ActivityIndicator size="small" color="#6366F1" />}
            </View>
            
            {locationError ? (
              <View style={styles.errorWrapper}>
                <Text style={styles.errorText}>{locationError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={requestLocation} disabled={isLocating}>
                  <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            ) : location ? (
              <View style={styles.coordsWrapper}>
                <View style={styles.coordCol}>
                  <Text style={styles.coordLabel}>LATITUDE</Text>
                  <Text style={styles.coordValue}>{location.coords.latitude.toFixed(6)}</Text>
                </View>
                <View style={styles.coordCol}>
                  <Text style={styles.coordLabel}>LONGITUDE</Text>
                  <Text style={styles.coordValue}>{location.coords.longitude.toFixed(6)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.locatingPlaceholder}>
                <Text style={styles.locatingText}>Obtendo sinal do satélite...</Text>
              </View>
            )}
            
            {!isLocating && location && (
              <TouchableOpacity style={styles.refreshLocationButton} onPress={requestLocation}>
                <Text style={styles.refreshLocationButtonText}>Atualizar Localização</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  safeContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 20 },
  
  // Estilos de Permissão
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 24 },
  permissionCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, alignItems: 'center', width: '100%', shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  permissionIcon: { fontSize: 50, marginBottom: 20 },
  permissionTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  permissionText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  
  // Estilos do Avatar e Câmera
  avatarWrapper: { position: 'relative', marginBottom: 28, alignItems: 'center' },
  cameraContainer: { width: 170, height: 170, borderRadius: 85, overflow: 'hidden', borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  camera: { flex: 1 },
  statusBadge: { position: 'absolute', bottom: -5, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Estilos do Cartão
  infoCard: { width: '100%', backgroundColor: '#FFFFFF', padding: 28, borderRadius: 24, shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  roleText: { color: '#6366F1', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  name: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  course: { fontSize: 16, color: '#64748B', fontWeight: '500', marginBottom: 24 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 20 },

  // Estilos de GPS
  locationSection: { width: '100%' },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  locationTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  coordsWrapper: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 },
  coordCol: { flex: 1, alignItems: 'center' },
  coordLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  coordValue: { fontSize: 16, fontWeight: '700', color: '#6366F1' },
  locatingPlaceholder: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  locatingText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  
  // Estilos de Erro e Botões
  errorWrapper: { alignItems: 'center', padding: 12 },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  primaryButton: { backgroundColor: '#6366F1', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center', shadowColor: '#6366F1', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  retryButton: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  refreshLocationButton: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  refreshLocationButtonText: { color: '#475569', fontSize: 14, fontWeight: '700' }
});
