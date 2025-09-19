import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface AssignedClient {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  assigned_at: string;
  active_plans: number;
}

interface Meal {
  name: string;
  foods: string[];
  time: string;
  calories: string;
  instructions?: string;
}

interface Supplement {
  name: string;
  dosage: string;
  time: string;
  instructions?: string;
}

export default function CreateNutritionPlan() {
  const [loading, setLoading] = useState(false);
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<AssignedClient | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  
  // Plan data
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [dailyCalories, setDailyCalories] = useState('1800');
  const [waterIntake, setWaterIntake] = useState('2.5');
  
  const [meals, setMeals] = useState<Meal[]>([
    {
      name: 'Café da Manhã',
      foods: ['2 ovos mexidos', '1 fatia de pão integral', '1 copo de leite desnatado', '1/2 abacate'],
      time: '07:00',
      calories: '450',
      instructions: 'Consumir até 30 minutos após acordar'
    },
    {
      name: 'Lanche da Manhã',
      foods: ['1 maçã', '10g de castanha-do-pará'],
      time: '10:00',
      calories: '200',
      instructions: 'Opção de lanche leve'
    },
    {
      name: 'Almoço',
      foods: ['150g de frango grelhado', '100g de arroz integral', '100g de brócolis', 'Salada verde'],
      time: '12:30',
      calories: '600',
      instructions: 'Refeição principal do dia'
    },
    {
      name: 'Lanche da Tarde',
      foods: ['1 iogurte natural', '1 colher de granola'],
      time: '15:30',
      calories: '180',
      instructions: 'Rico em proteínas'
    },
    {
      name: 'Jantar',
      foods: ['120g de peixe assado', '100g de batata doce', 'Legumes refogados'],
      time: '19:00',
      calories: '450',
      instructions: 'Refeição leve para o período noturno'
    }
  ]);

  const [supplements, setSupplements] = useState<Supplement[]>([
    {
      name: 'Whey Protein',
      dosage: '30g',
      time: 'Pós-treino',
      instructions: 'Misturar com 200ml de água'
    },
    {
      name: 'Ômega 3',
      dosage: '1 cápsula',
      time: 'Café da manhã',
      instructions: 'Tomar com alimento'
    },
    {
      name: 'Multivitamínico',
      dosage: '1 comprimido',
      time: 'Café da manhã',
      instructions: 'Uso diário'
    }
  ]);

  const router = useRouter();

  useEffect(() => {
    loadAssignedClients();
  }, []);

  const loadAssignedClients = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/nutritionist/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/my-assigned-clients`, { headers });
      
      setAssignedClients(response.data.assigned_clients || []);
    } catch (error: any) {
      console.error('Error loading assigned clients:', error);
      if (error.response?.status === 401) {
        router.replace('/professional/nutritionist/login');
      }
      setAssignedClients([]);
    }
  };

  const updateMeal = (index: number, field: string, value: string) => {
    const updatedMeals = [...meals];
    if (field === 'foods') {
      updatedMeals[index].foods = value.split('\n').filter(item => item.trim());
    } else {
      (updatedMeals[index] as any)[field] = value;
    }
    setMeals(updatedMeals);
  };

  const updateSupplement = (index: number, field: string, value: string) => {
    const updatedSupplements = [...supplements];
    (updatedSupplements[index] as any)[field] = value;
    setSupplements(updatedSupplements);
  };

  const handleCreatePlan = async () => {
    if (!selectedClient) {
      Alert.alert('Erro', 'Selecione um cliente para criar o plano nutricional');
      return;
    }

    if (!planTitle.trim()) {
      Alert.alert('Erro', 'Digite um título para o plano');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };

      const planData = {
        client_id: selectedClient.id,
        title: planTitle,
        description: planDescription,
        duration_days: parseInt(duration),
        daily_calories: parseInt(dailyCalories),
        water_intake: parseFloat(waterIntake),
        meals: meals,
        supplements: supplements,
        professional_type: 'nutritionist'
      };

      await axios.post(`${API_URL}/professionals/create-plan`, planData, { headers });

      Alert.alert(
        'Sucesso!',
        `Plano nutricional criado para ${selectedClient.full_name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedClient(null);
              setPlanTitle('');
              setPlanDescription('');
              router.back();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating plan:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível criar o plano');
    } finally {
      setLoading(false);
    }
  };

  const selectClient = (client: AssignedClient) => {
    setSelectedClient(client);
    setPlanTitle(`Plano Nutricional - ${client.full_name}`);
    setShowClientModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="nutrition" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Criar Plano Nutricional</Text>
              <Text style={styles.headerSubtitle}>
                {selectedClient ? `Para: ${selectedClient.full_name}` : 'Selecione um cliente'}
              </Text>
            </View>
          </View>

          {/* Client Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={18} color="#22C55E" /> Cliente
            </Text>
            
            <TouchableOpacity
              style={[styles.clientSelector, !selectedClient && styles.clientSelectorEmpty]}
              onPress={() => setShowClientModal(true)}
            >
              {selectedClient ? (
                <View style={styles.selectedClientInfo}>
                  <View style={styles.clientDetails}>
                    <Text style={styles.clientName}>{selectedClient.full_name}</Text>
                    <Text style={styles.clientEmail}>{selectedClient.email}</Text>
                    <Text style={styles.clientPlan}>Plano: {selectedClient.plan_type.toUpperCase()}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                </View>
              ) : (
                <View style={styles.emptyClientSelector}>
                  <Ionicons name="person-add" size={24} color="#64748B" />
                  <Text style={styles.emptyClientText}>Selecionar Cliente</Text>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.clientCount}>
              {assignedClients.length} {assignedClients.length === 1 ? 'cliente atribuído' : 'clientes atribuídos'}
            </Text>
          </View>

          {/* Plan Details - Only show if client is selected */}
          {selectedClient && (
            <>
              {/* Plan Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="document-text" size={18} color="#22C55E" /> Informações do Plano
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Título do Plano</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: Plano para Emagrecimento"
                    placeholderTextColor="#64748B"
                    value={planTitle}
                    onChangeText={setPlanTitle}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Descrição</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Descreva os objetivos e características do plano..."
                    placeholderTextColor="#64748B"
                    value={planDescription}
                    onChangeText={setPlanDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Duração (dias)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="30"
                      placeholderTextColor="#64748B"
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Calorias/dia</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="1800"
                      placeholderTextColor="#64748B"
                      value={dailyCalories}
                      onChangeText={setDailyCalories}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Água (L/dia)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="2.5"
                      placeholderTextColor="#64748B"
                      value={waterIntake}
                      onChangeText={setWaterIntake}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Meals Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="restaurant" size={18} color="#22C55E" /> Refeições ({meals.length})
                </Text>

                {meals.map((meal, index) => (
                  <View key={index} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealTitle}>{meal.name}</Text>
                      <TouchableOpacity style={styles.editButton}>
                        <Text style={styles.editButtonText}>Editar</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Horário</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="07:00"
                          placeholderTextColor="#64748B"
                          value={meal.time}
                          onChangeText={(value) => updateMeal(index, 'time', value)}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Calorias</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="450"
                          placeholderTextColor="#64748B"
                          value={meal.calories}
                          onChangeText={(value) => updateMeal(index, 'calories', value)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Alimentos (um por linha)</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        placeholder="2 ovos mexidos&#10;1 fatia de pão integral&#10;1 copo de leite"
                        placeholderTextColor="#64748B"
                        value={meal.foods.join('\n')}
                        onChangeText={(value) => updateMeal(index, 'foods', value)}
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Instruções</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Observações sobre a refeição..."
                        placeholderTextColor="#64748B"
                        value={meal.instructions}
                        onChangeText={(value) => updateMeal(index, 'instructions', value)}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {/* Supplements Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="medical" size={18} color="#F59E0B" /> Suplementos ({supplements.length})
                </Text>

                {supplements.map((supplement, index) => (
                  <View key={index} style={styles.supplementCard}>
                    <View style={styles.supplementHeader}>
                      <Text style={styles.supplementTitle}>{supplement.name}</Text>
                      <TouchableOpacity style={styles.editButton}>
                        <Text style={styles.editButtonText}>Editar</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Dosagem</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="30g"
                          placeholderTextColor="#64748B"
                          value={supplement.dosage}
                          onChangeText={(value) => updateSupplement(index, 'dosage', value)}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Horário</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Pós-treino"
                          placeholderTextColor="#64748B"
                          value={supplement.time}
                          onChangeText={(value) => updateSupplement(index, 'time', value)}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Instruções</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Como tomar o suplemento..."
                        placeholderTextColor="#64748B"
                        value={supplement.instructions}
                        onChangeText={(value) => updateSupplement(index, 'instructions', value)}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.createButton, loading && styles.createButtonDisabled]}
                onPress={handleCreatePlan}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Criar Plano Nutricional</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Client Selection Modal */}
        <Modal
          visible={showClientModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowClientModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Cliente</Text>
                <TouchableOpacity onPress={() => setShowClientModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {assignedClients.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color="#64748B" />
                    <Text style={styles.emptyText}>Nenhum cliente atribuído</Text>
                    <Text style={styles.emptySubtext}>
                      Vá para a aba "Novos" para assumir clientes
                    </Text>
                  </View>
                ) : (
                  assignedClients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.clientCard}
                      onPress={() => selectClient(client)}
                    >
                      <View style={styles.clientCardContent}>
                        <View style={styles.clientCardInfo}>
                          <Text style={styles.clientCardName}>{client.full_name}</Text>
                          <Text style={styles.clientCardEmail}>{client.email}</Text>
                          <Text style={styles.clientCardPlan}>
                            Plano: {client.plan_type.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.clientCardMeta}>
                          <Text style={styles.activeNutritionPlansText}>
                            {client.active_plans} planos ativos
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color="#22C55E" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#22C55E',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  clientSelectorEmpty: {
    borderColor: 'rgba(100, 116, 139, 0.3)',
    borderStyle: 'dashed',
  },
  selectedClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  clientEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 2,
  },
  clientPlan: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyClientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  emptyClientText: {
    color: '#94A3B8',
    fontSize: 16,
    marginHorizontal: 12,
  },
  clientCount: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  editButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  supplementCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplementTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#64748B',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0B0D17',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  clientCardInfo: {
    flex: 1,
  },
  clientCardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientCardEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  clientCardPlan: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  clientCardMeta: {
    alignItems: 'flex-end',
  },
  activeNutritionPlansText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4,
  },
});