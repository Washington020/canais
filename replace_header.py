#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/admin/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# Define the old text to replace
old_text = '''  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>A</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Painel Admin</Text>
              <Text style={styles.adminRole}>Luxe Forma</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Sair</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }'''

# Define the new text
new_text = '''  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Navigation System */}
      <NavigationSystem 
        title="Painel Administrativo" 
        showBackButton={true}
        showExitButton={true}
      />

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }'''

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
    
    # Try to find the return statement
    if "return (" in content:
        print("✅ Found 'return (' in file")
    
    if "SafeAreaView style={styles.container}" in content:
        print("✅ Found SafeAreaView in file")
        
    if "StatusBar style=\"light\"" in content:
        print("✅ Found StatusBar in file")