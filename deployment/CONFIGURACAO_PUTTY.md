# 🔧 Como Configurar o PuTTY - Passo a Passo

## 📋 TELA INICIAL DO PUTTY

Quando você abrir o PuTTY, vai ver essa tela. Aqui está EXATAMENTE o que colocar:

---

## ✍️ CAMPOS PARA PREENCHER:

### 1️⃣ Host Name (or IP address)
```
145.223.29.167
```
**Digite:** `145.223.29.167`

---

### 2️⃣ Port
```
22
```
**Já está correto!** Deixe como `22`

---

### 3️⃣ Connection type
```
⚫ SSH
```
**Já está selecionado!** Deixe marcado em `SSH`

---

## 🎯 RESUMO VISUAL:

```
┌─────────────────────────────────────────┐
│  PuTTY Configuration                    │
├─────────────────────────────────────────┤
│                                         │
│  Host Name (or IP address):             │
│  ┌─────────────────────────┐            │
│  │ 145.223.29.167          │ ← DIGITE   │
│  └─────────────────────────┘            │
│                                         │
│  Port:                                  │
│  ┌─────┐                                │
│  │ 22  │ ← JÁ ESTÁ CERTO                │
│  └─────┘                                │
│                                         │
│  Connection type:                       │
│  ⚫ SSH   ⚪ Serial   ⚪ Telnet           │
│     ↑                                   │
│  DEIXE MARCADO EM SSH                   │
│                                         │
│  [ Open ]  [ Cancel ]                   │
│     ↑                                   │
│  CLIQUE AQUI DEPOIS                     │
└─────────────────────────────────────────┘
```

---

## 📝 PASSO A PASSO:

### Passo 1: Digite o IP
- Clique no campo "Host Name (or IP address)"
- Digite: `145.223.29.167`

### Passo 2: Verifique a Porta
- O campo "Port" deve estar com: `22`
- Se não estiver, mude para `22`

### Passo 3: Verifique o Tipo
- "Connection type" deve estar marcado em: `SSH`
- Se não estiver, clique no círculo ao lado de SSH

### Passo 4: Clique em Open
- Clique no botão `Open` no canto inferior

---

## ⚠️ O QUE VAI ACONTECER DEPOIS:

### 1️⃣ Alerta de Segurança
Vai aparecer uma janela perguntando:
```
The server's host key is not cached in the registry...
Do you trust this host?
```

**CLIQUE EM:** `Yes` ou `Accept`

### 2️⃣ Tela Preta Aparece
Vai abrir uma janela preta pedindo:
```
login as:
```

**DIGITE:** `root`
**APERTE:** Enter

### 3️⃣ Senha
Vai pedir:
```
root@145.223.29.167's password:
```

**DIGITE:** `279717@Luxepass`
**APERTE:** Enter

**⚠️ IMPORTANTE:** Quando você digitar a senha, NÃO VAI APARECER NADA na tela! Isso é normal! É por segurança. Digite mesmo assim e aperte Enter.

### 4️⃣ Conectado!
Se tudo deu certo, vai aparecer algo assim:
```
Welcome to Ubuntu 22.04 LTS
root@hostname:~#
```

**Pronto! Você está dentro do servidor!** 🎉

---

## 🎯 VALORES COMPLETOS:

```
╔════════════════════════════════════╗
║  CONFIGURAÇÃO DO PUTTY             ║
╠════════════════════════════════════╣
║  Host Name: 145.223.29.167         ║
║  Port: 22                          ║
║  Connection type: SSH              ║
║                                    ║
║  Login: root                       ║
║  Password: 279717@Luxepass         ║
╚════════════════════════════════════╝
```

---

## 💾 DICA: SALVAR CONFIGURAÇÃO

Para não ter que digitar toda vez:

1. Preencha os campos (IP, Port, SSH)
2. No campo "Saved Sessions" (parte de baixo), digite: `LuxePass VPS`
3. Clique em `Save`
4. Da próxima vez:
   - Clique em `LuxePass VPS` na lista
   - Clique em `Load`
   - Clique em `Open`

---

## ❓ PROBLEMAS COMUNS:

### "Network error: Connection refused"
✅ **Solução:** 
- Verifique se digitou o IP correto: `145.223.29.167`
- Verifique se a porta está `22`

### "Login incorrect"
✅ **Solução:**
- Verifique se digitou `root` corretamente
- Senha: `279717@Luxepass` (com @ e L maiúsculo)

### "Access denied"
✅ **Solução:**
- Aguarde alguns segundos e tente novamente
- Senha pode estar incorreta

---

**Conseguiu conectar?** Se sim, prossiga para o próximo passo! 🚀

Se tiver algum erro, me envie a mensagem que apareceu!
