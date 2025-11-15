# 📱 GUIA: CRIAR APK ANDROID PARA TESTAR SEM EXPO GO

## 🎯 OBJETIVO
Criar um arquivo APK que você pode instalar diretamente no seu celular Android para testar todas as funcionalidades, sem depender do Expo Go.

---

## 🚀 OPÇÃO 1: BUILD LOCAL COM EXPO (MAIS RÁPIDO)

### **Pré-requisitos:**
- Android Studio instalado (ou apenas Android SDK)
- Java JDK 17+

### **Passos:**

**1. Instalar dependências:**
```bash
cd /app/frontend
npx expo install expo-dev-client
```

**2. Gerar APK de desenvolvimento:**
```bash
npx expo run:android --variant debug
```

**3. Localizar APK gerado:**
```
/app/frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

**4. Transferir para o celular:**
- Via cabo USB: `adb install app-debug.apk`
- Via download: Upload para Google Drive ou similar

---

## ☁️ OPÇÃO 2: BUILD NA NUVEM COM EAS (RECOMENDADO)

### **Vantagens:**
- ✅ Não precisa de Android Studio
- ✅ Build feito nos servidores Expo
- ✅ APK pronto para download

### **Passos:**

**1. Login no Expo:**
Você precisa criar uma conta gratuita em https://expo.dev

**2. Configurar projeto:**
```bash
cd /app/frontend
npx eas-cli login
npx eas-cli build:configure
```

**3. Criar build de desenvolvimento (Android):**
```bash
npx eas-cli build --profile development --platform android
```

**4. Aguardar (10-15 minutos):**
O EAS vai:
- Fazer upload do código
- Compilar o APK
- Disponibilizar link para download

**5. Instalar no celular:**
- Baixar APK do link fornecido
- Ativar "Instalar apps de fontes desconhecidas"
- Instalar o APK

---

## 🔧 CONFIGURAÇÃO NECESSÁRIA

Antes de fazer o build, você precisa:

### **1. Corrigir ícones/splash faltantes:**

Criar arquivo `/app/frontend/assets/images/splash-icon.png`:
- Tamanho: 1024x1024px
- Formato: PNG com fundo transparente
- Conteúdo: Logo do LuxePass

**OU** remover referência do app.json:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png"
    }
  }
}
```

### **2. Configurar app.json para build:**

```json
{
  "expo": {
    "name": "LuxePass",
    "slug": "luxepass",
    "version": "1.0.0",
    "android": {
      "package": "com.luxepass.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#0B0D17"
      }
    }
  }
}
```

---

## 📦 OPÇÃO 3: APK PREVIEW RÁPIDO (MAIS SIMPLES)

Para apenas testar rapidamente:

```bash
cd /app/frontend
npx eas-cli build --profile preview --platform android
```

Isso gera um APK otimizado (não debug) que você pode instalar e testar.

---

## ⚡ SOLUÇÃO RÁPIDA: EU FAÇO O BUILD PARA VOCÊ

Se você quiser, eu posso:

1. Preparar o projeto
2. Gerar o APK via EAS Build
3. Te fornecer o link de download

**Para isso, preciso que você:**
1. Crie uma conta gratuita em https://expo.dev
2. Me forneça um token de acesso (EXPO_TOKEN)
   - Vá em https://expo.dev/accounts/[seu-usuario]/settings/access-tokens
   - Crie um token com permissões de build
   - Me passe o token

---

## 🎯 RESULTADO FINAL

Após seguir qualquer uma das opções, você terá:

✅ **app-debug.apk** ou **luxepass.apk**
✅ Arquivo de 40-80MB
✅ Instalável em qualquer Android
✅ Funciona sem Expo Go
✅ Todas as funcionalidades nativas disponíveis

---

## 🆘 RESOLUÇÃO DE PROBLEMAS

**Erro: "Install blocked"**
- Solução: Ativar "Instalar de fontes desconhecidas" nas configurações

**Erro: "App not installed"**
- Solução: Desinstalar versão antiga primeiro

**Erro: "Parse error"**
- Solução: APK pode estar corrompido, fazer download novamente

---

## 📞 PRÓXIMOS PASSOS

**Qual opção você prefere?**

**A)** Eu faço o build para você (preciso do token Expo)
**B)** Você faz o build local (precisa Android Studio)
**C)** Você faz o build na nuvem (precisa criar conta Expo)

**Me avise qual opção e te guio no processo!** 🚀
