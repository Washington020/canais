#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/admin/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# Define the old text to replace
old_text = """  const handleLogout = async () => {
    Alert.alert(
      'Sair do Painel',
      'Tem certeza que deseja sair do painel administrativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Iniciando logout do admin...');
              
              // Limpar TODOS os dados do AsyncStorage
              await AsyncStorage.clear();
              
              // Confirmar limpeza
              console.log('✅ AsyncStorage limpo');
              
              // Navegar para página inicial IMEDIATAMENTE
              router.replace('/');
              console.log('✅ Redirecionado para página inicial');
              
              // Mostrar sucesso após navegar
              setTimeout(() => {
                Alert.alert('Sucesso', 'Logout realizado com sucesso!');
              }, 1000);
              
            } catch (error) {
              console.error('❌ Erro no logout do admin:', error);
              Alert.alert('Erro', 'Erro ao fazer logout. Tente novamente.');
            }
          }
        }
      ]
    );
  };"""

# Define the new text
new_text = """  const handleLogout = () => {
    Alert.alert(
      'Sair do Painel',
      'Tem certeza que deseja sair do painel administrativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Iniciando logout do admin...');
              
              // Limpar TODOS os dados do AsyncStorage
              await AsyncStorage.clear();
              
              console.log('✅ AsyncStorage limpo');
              
              // Navegar para página inicial IMEDIATAMENTE
              router.push('/');
              
              console.log('✅ Redirecionado para página inicial');
              
            } catch (error) {
              console.error('❌ Erro no logout do admin:', error);
              Alert.alert('Erro', 'Erro ao fazer logout. Tente novamente.');
            }
          }
        }
      ]
    );
  };"""

# Perform the replacement
if old_text in content:
    new_content = content.replace(old_text, new_text)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/admin/(tabs)/index.tsx', 'w') as f:
        f.write(new_content)
    
    print("✅ Replacement successful!")
else:
    print("❌ Old text not found in file")
    print("Searching for partial matches...")
    
    # Let's check if we can find the function signature
    if "const handleLogout = async () => {" in content:
        print("Found function signature")
    else:
        print("Function signature not found")