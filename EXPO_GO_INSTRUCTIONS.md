# 📱 Como Testar o LuxePass no Expo Go

## ✅ URL Correta do Expo

```
exp://trainconnect-1.preview.emergentagent.com
```

## 📋 Instruções Passo a Passo

### 1. Instale o Expo Go no seu celular
- **Android**: [Play Store - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)

### 2. Opções para Conectar

#### Opção A: Escanear QR Code
1. Abra o arquivo `/app/frontend/EXPO_QR.html` no navegador
2. Escaneie o QR Code:
   - **iOS**: Use a câmera nativa do iPhone (não precisa abrir o Expo Go)
   - **Android**: Abra o Expo Go → Toque em "Scan QR Code"

#### Opção B: Digitar URL Manualmente
1. Abra o Expo Go
2. Digite manualmente: `exp://trainconnect-1.preview.emergentagent.com`
3. Toque em "Connect"

#### Opção C: Ver QR Code no Terminal
```bash
python3 /app/generate_qr.py
```

### 3. Aguarde o Carregamento
- O app pode levar 10-30 segundos para carregar
- Você verá uma barra de progresso
- **Importante**: Mantenha o Expo Go aberto durante o carregamento

### 4. Teste as Funcionalidades

#### Login de Teste:
- **Cliente Intermediário**: 
  - Email: `intermediario@luxepass.com`
  - Senha: `inter123`
  
- **Cliente VIP**: 
  - Email: `vip@luxepass.com`
  - Senha: `vip123`

- **Nutricionista**: 
  - Email: `nutri@luxepass.com`
  - Senha: `nutri123`

- **Personal Trainer**: 
  - Email: `personal@luxepass.com`
  - Senha: `personal123`

#### Testando Videochamadas:
1. Faça login como Cliente
2. Vá para "Agendamentos"
3. Se tiver consultas agendadas, verá o botão **"Entrar em Consulta"** (verde com ícone de câmera)
4. Clique no botão para iniciar a videochamada
5. ⚠️ **IMPORTANTE**: Para testar a call, você precisa de 2 dispositivos:
   - Um como cliente
   - Outro como profissional (nutricionista ou personal)

## ⚠️ Troubleshooting

### Erro "Endpoint is offline"
- ✅ Já corrigido! Use a nova URL: `exp://trainconnect-1.preview.emergentagent.com`
- O erro anterior era porque estava usando um túnel ngrok antigo

### App não carrega
1. Verifique se está na mesma rede Wi-Fi (não é necessário, mas ajuda)
2. Feche e abra o Expo Go novamente
3. Tente limpar o cache: Expo Go → Settings → Clear Cache

### Botões de videochamada não aparecem
- Os botões só aparecem em consultas com status "agendado"
- Se não tiver consultas agendadas, você precisa:
  1. Fazer login como profissional
  2. Disponibilizar horários
  3. Fazer login como cliente
  4. Agendar uma consulta

### Videochamada não conecta
- Certifique-se de que ambos os participantes (cliente e profissional) entraram na call
- Verifique as permissões de câmera e microfone no celular
- A call usa WebRTC via PeerJS

## 📊 Limites de Consultas Implementados

- **Plano Básico**: ❌ 0 consultas (bloqueado)
- **Plano Intermediário**: ✅ 1 Nutricionista + 1 Personal (2 total, separados)
- **Plano VIP**: ✅ 2 Nutricionista + 2 Personal (4 total, separados)

## 🎯 Tokens de Academia

- Todos os planos: **31 tokens** (1 por dia do mês)

## 🔗 Links Úteis

- **Preview Web**: https://pagsys.preview.emergentagent.com
- **QR Code HTML**: /app/frontend/EXPO_QR.html
- **QR Code PNG**: /app/frontend/expo_qr_code.png

---

**Última atualização**: 2025-06-14
**Status**: ✅ Funcionando corretamente
