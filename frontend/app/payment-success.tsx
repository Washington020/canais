import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { planName } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#27AE60', '#229954']}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✅</Text>
        </View>

        <Text style={styles.title}>Pagamento Aprovado!</Text>
        <Text style={styles.subtitle}>
          Bem-vindo ao LuxePass
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Seu plano <Text style={styles.bold}>{planName}</Text> foi ativado com sucesso!
          </Text>
        </View>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>O que você pode fazer agora:</Text>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🏋️‍♂️</Text>
            <Text style={styles.benefitText}>
              Gerar tokens para academias parceiras
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>👨‍⚕️</Text>
            <Text style={styles.benefitText}>
              Agendar consultas com nutricionistas
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💪</Text>
            <Text style={styles.benefitText}>
              Agendar consultas com personal trainers
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>📊</Text>
            <Text style={styles.benefitText}>
              Acessar planos personalizados de treino e dieta
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.buttonText}>Ir para o App</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Enviamos um e-mail de confirmação com todos os detalhes da sua assinatura.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  infoText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 24,
  },
  bold: {
    fontWeight: 'bold',
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#34495E',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    marginBottom: 24,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  footerText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
