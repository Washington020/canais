import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SejaLuxeScreen() {
  const router = useRouter();

  const plans = [
    {
      id: 'basico',
      name: 'Plano Básico',
      activationFee: 29.90,
      monthlyPrice: 99.90,
      firstPayment: 129.80,
      color: ['#4A90E2', '#357ABD'],
      features: [
        '✓ Acesso ilimitado a academias básicas',
        '✓ App exclusivo LuxePass',
        '✓ Suporte por WhatsApp',
        '✓ Check-in inteligente',
        '✓ Flexibilidade total de horários',
      ],
      fidelity: '12 meses',
    },
    {
      id: 'intermediario',
      name: 'Plano Intermediário',
      activationFee: 59.90,
      monthlyPrice: 159.90,
      firstPayment: 219.80,
      color: ['#9B59B6', '#8E44AD'],
      badge: '🏆 MAIS VENDIDO',
      features: [
        '✓ Tudo do Plano Básico',
        '✓ 1 consulta mensal com nutricionista',
        '✓ 1 consulta mensal com personal trainer',
        '✓ Planos personalizados de treino',
        '✓ Orientação nutricional completa',
        '✓ Suporte prioritário 24/7',
      ],
      fidelity: '12 meses',
    },
    {
      id: 'vip',
      name: 'Plano VIP',
      activationFee: 0.00,
      monthlyPrice: 349.90,
      firstPayment: 349.90,
      color: ['#F39C12', '#E67E22'],
      badge: '👑 VIP',
      features: [
        '✓ Tudo dos Planos anteriores',
        '✓ 2 consultas mensais com nutricionista',
        '✓ 2 consultas mensais com personal trainer',
        '✓ Acompanhamento semanal personalizado',
        '✓ Acesso a academias VIP exclusivas',
        '✓ Relatórios detalhados de evolução',
        '✓ Suporte dedicado via WhatsApp',
        '✓ SEM taxa de adesão!',
      ],
      fidelity: 'Sem fidelidade',
    },
  ];

  const handleChoosePlan = (planId: string) => {
    router.push({
      pathname: '/register',
      params: { plan: planId },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seja LuxePass</Text>
        <Text style={styles.headerSubtitle}>
          Escolha o plano ideal para você
        </Text>
      </View>

      <View style={styles.plansContainer}>
        {plans.map((plan) => (
          <View key={plan.id} style={styles.planCard}>
            <LinearGradient
              colors={plan.color}
              style={styles.planGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {plan.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>

              <View style={styles.priceContainer}>
                {plan.activationFee > 0 ? (
                  <>
                    <Text style={styles.activationFee}>
                      Taxa de Adesão: R$ {plan.activationFee.toFixed(2)}
                    </Text>
                    <Text style={styles.firstPayment}>
                      1º Pagamento: R$ {plan.firstPayment.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.freeActivation}>
                    🎁 TAXA DE ADESÃO GRÁTIS!
                  </Text>
                )}

                <View style={styles.monthlyPriceBox}>
                  <Text style={styles.monthlyPriceLabel}>Mensalidade:</Text>
                  <Text style={styles.monthlyPrice}>
                    R$ {plan.monthlyPrice.toFixed(2)}
                  </Text>
                  <Text style={styles.monthlyPriceLabel}>/mês</Text>
                </View>
              </View>

              <View style={styles.fidelityBox}>
                <Text style={styles.fidelityText}>
                  Fidelidade: {plan.fidelity}
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, index) => (
                <Text key={index} style={styles.featureText}>
                  {feature}
                </Text>
              ))}
            </View>

            <TouchableOpacity
              style={styles.chooseButton}
              onPress={() => handleChoosePlan(plan.id)}
            >
              <Text style={styles.chooseButtonText}>Escolher Plano</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ao escolher um plano, você será direcionado para o cadastro e
          visualização do contrato completo.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 24,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ECF0F1',
  },
  plansContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  planGradient: {
    padding: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  planName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  priceContainer: {
    marginTop: 8,
  },
  activationFee: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  firstPayment: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  freeActivation: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  monthlyPriceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 8,
  },
  monthlyPriceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginHorizontal: 4,
  },
  monthlyPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fidelityBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  fidelityText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  featuresContainer: {
    padding: 20,
  },
  featureText: {
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 10,
    lineHeight: 22,
  },
  chooseButton: {
    backgroundColor: '#27AE60',
    padding: 16,
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    alignItems: 'center',
  },
  chooseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
});
