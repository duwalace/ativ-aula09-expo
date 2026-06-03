import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';

export default function SecurityAppScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  
  // Estados para o Fallback de PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    (async () => {
      // Verifica se o dispositivo possui hardware de biometria
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsSupported(compatible);
    })();
  }, []);

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Acesso Restrito: Confirme sua identidade',
        fallbackLabel: 'Usar senha PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthenticated(true);
        setPinError('');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de comunicação com o módulo biométrico.');
    }
  };

  const handleKeyPress = (char: string) => {
    setPinError('');
    if (pin.length < 4) {
      const newPin = pin + char;
      setPin(newPin);
      
      // Verifica se completou 4 dígitos
      if (newPin === '1234') {
        setTimeout(() => {
          setIsAuthenticated(true);
          setShowPinModal(false);
          setPin('');
        }, 150);
      } else if (newPin.length === 4) {
        // PIN Errado
        setTimeout(() => {
          setPinError('Código PIN inválido!');
          setPin('');
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  if (isSupported === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  // TELA DE BLOQUEIO (Não Autenticado)
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.darkContainer} edges={['bottom']}>
        <View style={styles.lockContent}>
          {/* Ícone de Escudo de Segurança */}
          <View style={styles.shieldWrapper}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <View style={styles.pulseRing} />
          </View>
          
          <Text style={styles.lockTitle}>SISTEMA PROTEGIDO</Text>
          <Text style={styles.lockSubtitle}>
            Esta é uma área altamente confidencial. Autentique-se para ter acesso ao banco de dados.
          </Text>

          <View style={styles.lockActions}>
            {isSupported ? (
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricAuth}>
                <Text style={styles.fingerprintIcon}>👤</Text>
                <Text style={styles.biometricButtonText}>Desbloquear com Biometria</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noHardwareBadge}>
                <Text style={styles.noHardwareText}>Biometria não detectada no hardware</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.pinLinkButton, !isSupported && styles.pinLinkButtonHighlight]} 
              onPress={() => { setShowPinModal(true); setPin(''); setPinError(''); }}
            >
              <Text style={styles.pinLinkButtonText}>Entrar com Código PIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal do Keypad para Código PIN Fallback */}
        <Modal
          visible={showPinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Digite o PIN de Acesso</Text>
                <Text style={styles.modalSub}>Padrão acadêmico: 1234</Text>
                <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowPinModal(false)}>
                  <Text style={styles.closeModalButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Indicador de Bolinhas do PIN */}
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

              {/* Teclado Numérico */}
              <View style={styles.keypad}>
                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
                  <View key={rIdx} style={styles.keypadRow}>
                    {row.map((num) => (
                      <TouchableOpacity 
                        key={num} 
                        style={styles.keypadKey} 
                        onPress={() => handleKeyPress(num)}
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
                    onPress={() => handleKeyPress('0')}
                  >
                    <Text style={styles.keyText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.keypadKey} 
                    onPress={handleBackspace}
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

  // TELA DESBLOQUEADA (Acesso Concedido)
  return (
    <SafeAreaView style={styles.darkContainer} edges={['bottom']}>
      <View style={styles.unlockedContent}>
        <View style={styles.successHeader}>
          <Text style={styles.successIcon}>🔓</Text>
          <Text style={styles.successTitle}>ACESSO CONCEDIDO</Text>
          <Text style={styles.successSubtitle}>Conexão criptografada estabelecida com o servidor local.</Text>
        </View>

        {/* Database Terminal Card */}
        <View style={styles.terminalCard}>
          <View style={styles.terminalHeader}>
            <View style={styles.terminalDotRed} />
            <View style={styles.terminalDotYellow} />
            <View style={styles.terminalDotGreen} />
            <Text style={styles.terminalTitle}>local_db_console.sh</Text>
          </View>
          <View style={styles.terminalBody}>
            <Text style={styles.terminalLine}><Text style={styles.termGreen}>$</Text> fetch_credentials --restricted</Text>
            <Text style={styles.terminalLine}>[INFO] Decodificando hashes de segurança...</Text>
            <Text style={styles.terminalLine}>[SUCCESS] Autorização acadêmica aceita.</Text>
            <View style={styles.terminalSpacer} />
            <Text style={styles.terminalLine}><Text style={styles.termYellow}>API KEY:</Text> SECURE-SENAI-DEV-99X88</Text>
            <Text style={styles.terminalLine}><Text style={styles.termYellow}>AMBIENTE:</Text> Homologação Acadêmica</Text>
            <Text style={styles.terminalLine}><Text style={styles.termYellow}>BACKUP:</Text> Sincronizado localmente (100% íntegro)</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.lockAppButton} 
          onPress={() => setIsAuthenticated(false)}
        >
          <Text style={styles.lockAppButtonText}>Bloquear Console de Segurança</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F19' },
  darkContainer: { flex: 1, backgroundColor: '#0B0F19' },
  
  // Tela de Bloqueio
  lockContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  shieldWrapper: { position: 'relative', width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  shieldIcon: { fontSize: 54, zIndex: 2 },
  pulseRing: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 2, borderColor: 'rgba(239, 68, 68, 0.3)' },
  lockTitle: { fontSize: 22, fontWeight: '900', color: '#EF4444', letterSpacing: 2, marginBottom: 12 },
  lockSubtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 10 },
  lockActions: { width: '100%', alignItems: 'center' },
  
  // Botões Autenticação
  biometricButton: { flexDirection: 'row', backgroundColor: '#EF4444', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, width: '100%', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fingerprintIcon: { fontSize: 20, color: '#FFFFFF', marginRight: 10 },
  biometricButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  noHardwareBadge: { backgroundColor: '#1E293B', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155', width: '100%', alignItems: 'center', marginBottom: 8 },
  noHardwareText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  pinLinkButton: { paddingVertical: 16 },
  pinLinkButtonHighlight: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 16, width: '100%', alignItems: 'center' },
  pinLinkButtonText: { color: '#38BDF8', fontSize: 15, fontWeight: '700' },

  // Unlocked Dashboard
  unlockedContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successHeader: { alignItems: 'center', marginBottom: 32 },
  successIcon: { fontSize: 50, marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#10B981', letterSpacing: 2, marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 16 },
  
  // Terminal Card
  terminalCard: { width: '100%', backgroundColor: '#020617', borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, marginBottom: 36, overflow: 'hidden' },
  terminalHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#1E293B' },
  terminalDotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginRight: 6 },
  terminalDotYellow: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B', marginRight: 6 },
  terminalDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginRight: 12 },
  terminalTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  terminalBody: { padding: 20, fontFamily: 'monospace' },
  terminalLine: { color: '#E2E8F0', fontSize: 13, lineHeight: 22, fontFamily: 'monospace', marginBottom: 4 },
  terminalSpacer: { height: 12 },
  termGreen: { color: '#10B981', fontWeight: '700' },
  termYellow: { color: '#F59E0B', fontWeight: '700' },
  lockAppButton: { backgroundColor: '#1E293B', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  lockAppButtonText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },

  // Modal PIN
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 17, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0B0F19', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, borderWidth: 1, borderColor: '#1E293B', borderBottomWidth: 0 },
  modalHeader: { alignItems: 'center', marginBottom: 20, position: 'relative', width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#64748B' },
  closeModalButton: { position: 'absolute', right: 0, top: -5, padding: 8 },
  closeModalButtonText: { color: '#64748B', fontSize: 18, fontWeight: '700' },
  pinIndicators: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8, height: 20 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#334155', marginHorizontal: 10 },
  pinDotFilled: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  pinDotError: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  pinErrorText: { color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  
  // Teclado Numérico
  keypad: { width: '100%', marginTop: 10, paddingBottom: 15 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  keypadKey: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  keypadKeyDummy: { width: 70, height: 70 },
  keyText: { fontSize: 24, fontWeight: '700', color: '#F8FAFC' }
});
