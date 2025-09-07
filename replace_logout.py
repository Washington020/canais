#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/client/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# Define the old text to replace
old_text = '''  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userType');
              await AsyncStorage.clear(); // Clear all AsyncStorage data
              
              // Navigate back to main screen
              router.replace('/');
              
              Alert.alert('Sucesso', 'Logout realizado com sucesso!');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Erro', 'Erro ao fazer logout. Tente novamente.');
            }
          }
        }
      ]
    );
  };'''

# Define the new text
new_text = '''  const handleLogout = async () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja fazer logout?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Iniciando logout do cliente...');
              
              // Limpar TODOS os dados do AsyncStorage
              await AsyncStorage.clear();
              
              // Confirmar limpeza
              console.log('✅ AsyncStorage limpo');
              
              // Fechar modal primeiro
              setShowSettingsModal(false);
              
              // Aguardar um pouco para o modal fechar
              setTimeout(() => {
                // Navegar para página inicial
                router.replace('/');
                console.log('✅ Redirecionado para página inicial');
              }, 500);
              
            } catch (error) {
              console.error('❌ Erro no logout:', error);
              Alert.alert('Erro', 'Erro ao fazer logout. Tente novamente.');
            }
          }
        }
      ]
    );
  };'''

# Perform the replacement
if old_text in content:
    new_content = content.replace(old_text, new_text)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/client/(tabs)/index.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Replacement successful!")
else:
    print("❌ Old text not found in file")
    print("Searching for partial matches...")
    
    # Try to find the function start
    if "const handleLogout = async () => {" in content:
        print("Found function start")
    else:
        print("Function start not found")