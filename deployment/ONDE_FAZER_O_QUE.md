# 🖥️ ONDE FAZER CADA COISA - Guia Visual

## 🎯 RESUMO RÁPIDO:

```
💻 SEU COMPUTADOR = Baixar programas + Enviar arquivos
🖥️ SERVIDOR VPS = Executar comandos/scripts
```

---

## 📍 DETALHAMENTO COMPLETO:

### ✅ NO SEU COMPUTADOR (Windows/Mac/Linux):

#### 1️⃣ Baixar e Instalar Programas:
```
💻 NO SEU COMPUTADOR
```
- Baixar PuTTY: https://www.putty.org/
- Baixar WinSCP: https://winscp.net/
- Instalar ambos normalmente (Next, Next, Finish)

---

#### 2️⃣ Enviar Scripts para o Servidor:
```
💻 NO SEU COMPUTADOR
```

**Usar WinSCP:**
1. Abrir WinSCP (programa instalado no seu PC)
2. Preencher os campos:
   - Host: `145.223.29.167`
   - User: `root`
   - Password: `279717@Luxepass`
3. Clicar em "Login"
4. Vai abrir 2 painéis:
   - **ESQUERDA = SEU COMPUTADOR** 💻
   - **DIREITA = SERVIDOR** 🖥️
5. No lado ESQUERDO (seu PC):
   - Navegar até onde baixou este projeto
   - Encontrar pasta `deployment`
6. No lado DIREITO (servidor):
   - Navegar até `/root/`
7. **ARRASTAR** a pasta `deployment` da ESQUERDA para DIREITA
8. Aguardar upload terminar

**Visual:**
```
┌─────────────────────┐         ┌─────────────────────┐
│   SEU COMPUTADOR    │  ═══>   │    SERVIDOR VPS     │
│  💻 /app/deployment │ ARRASTAR│ 🖥️ /root/deployment │
└─────────────────────┘         └─────────────────────┘
```

---

#### 3️⃣ Enviar Código Backend/Frontend (DEPOIS):
```
💻 NO SEU COMPUTADOR
```

**Usar WinSCP novamente:**
1. Mesma coisa: Abrir WinSCP e conectar
2. **Envio 1 - Backend:**
   ```
   SEU PC: /app/backend/*
           ⬇️ ARRASTAR
   SERVIDOR: /var/www/luxepass/backend/
   ```

3. **Envio 2 - Frontend:**
   ```
   SEU PC: /app/frontend/*
           ⬇️ ARRASTAR
   SERVIDOR: /var/www/luxepass/frontend/
   ```

---

### ✅ NO SERVIDOR VPS (Via PuTTY):

#### 4️⃣ Conectar no Servidor:
```
💻 NO SEU COMPUTADOR (mas abrindo porta pro servidor)
```

**Usar PuTTY:**
1. Abrir PuTTY (programa instalado no seu PC)
2. Preencher:
   - Host Name: `145.223.29.167`
   - Port: `22`
   - Connection type: `SSH`
3. Clicar "Open"
4. Vai abrir **TELA PRETA** (isso é o servidor!)
5. Digite: `root`
6. Digite senha: `279717@Luxepass`

**IMPORTANTE:**
- A partir daqui, TUDO que você digitar é NO SERVIDOR! 🖥️
- A tela preta = Terminal do servidor Linux

---

#### 5️⃣ Executar Comandos/Scripts:
```
🖥️ NO SERVIDOR (via tela preta do PuTTY)
```

**DIGITE estes comandos NA TELA PRETA:**

```bash
# Comando 1: Ir para pasta dos scripts
cd /root/deployment

# Comando 2: Dar permissão
chmod +x *.sh

# Comando 3: Executar instalação
./01_install_dependencies.sh

# (Aguardar terminar - 15-20 min)

# Comando 4: Executar deploy
./02_deploy_luxepass.sh

# (Vai pedir para apertar ENTER quando fizer upload)

# Comando 5: Configurar Nginx
./03_configure_nginx.sh

# Comando 6: Instalar SSL
./04_install_ssl.sh
```

---

### ✅ NO PAINEL DA HOSTINGER:

#### 6️⃣ Configurar DNS:
```
💻 NO SEU COMPUTADOR (mas no navegador)
```

1. Abrir navegador (Chrome, Firefox, etc)
2. Acessar: https://hpanel.hostinger.com
3. Fazer login
4. Clicar em: Domínios → luxepass.com.br
5. Clicar em: DNS / Name Servers
6. Adicionar 5 registros tipo "A":

```
Registro 1:
- Tipo: A
- Nome: api
- Aponta para: 145.223.29.167
- TTL: 3600
- Clicar "Adicionar"

Registro 2:
- Tipo: A
- Nome: app
- Aponta para: 145.223.29.167
- TTL: 3600
- Clicar "Adicionar"

Registro 3:
- Tipo: A
- Nome: profissional
- Aponta para: 145.223.29.167
- TTL: 3600
- Clicar "Adicionar"

Registro 4:
- Tipo: A
- Nome: admin
- Aponta para: 145.223.29.167
- TTL: 3600
- Clicar "Adicionar"

Registro 5:
- Tipo: A
- Nome: suporte
- Aponta para: 145.223.29.167
- TTL: 3600
- Clicar "Adicionar"
```

7. Salvar tudo
8. Aguardar 10-15 minutos

---

## 📊 ORDEM CRONOLÓGICA COMPLETA:

```
PASSO 1: 💻 SEU PC
         ↓ Baixar PuTTY e WinSCP
         
PASSO 2: 💻 SEU PC (WinSCP)
         ↓ Enviar pasta /deployment para servidor
         
PASSO 3: 💻 SEU PC (PuTTY - mas executando no servidor)
         ↓ Conectar no servidor
         ↓ cd /root/deployment
         ↓ chmod +x *.sh
         ↓ ./01_install_dependencies.sh
         ↓ (AGUARDAR 15-20 MIN)
         
PASSO 4: 💻 SEU PC (WinSCP)
         ↓ Enviar /app/backend para servidor
         ↓ Enviar /app/frontend para servidor
         
PASSO 5: 💻 SEU PC (Navegador - Painel Hostinger)
         ↓ Configurar DNS (5 registros tipo A)
         ↓ (AGUARDAR 10-15 MIN)
         
PASSO 6: 💻 SEU PC (PuTTY - mas executando no servidor)
         ↓ ./02_deploy_luxepass.sh
         ↓ ./03_configure_nginx.sh
         ↓ ./04_install_ssl.sh
         
PASSO 7: 💻 SEU PC (Navegador)
         ↓ Testar: https://app.luxepass.com.br
         
✅ PRONTO!
```

---

## 🎯 RESUMO FINAL:

### Você vai usar:

1. **WinSCP** 📦
   - Para enviar arquivos do seu PC para o servidor
   - Funciona como um "Ctrl+C / Ctrl+V" entre computadores

2. **PuTTY** ⌨️
   - Para digitar comandos no servidor
   - É como se você estivesse sentado na frente do servidor

3. **Navegador** 🌐
   - Para configurar DNS na Hostinger
   - Para testar o site no final

---

## ❓ PERGUNTAS COMUNS:

**P: Quando sei que estou no meu PC ou no servidor?**
R: 
- SEU PC: Você vê Windows, ícones, programas normais
- SERVIDOR: Tela preta do PuTTY com texto branco/verde

**P: Se fechar o PuTTY, perco tudo?**
R: 
- NÃO! O servidor continua rodando
- Pode fechar e abrir de novo quando quiser
- Os arquivos ficam salvos no servidor

**P: Preciso deixar o PC ligado depois do deploy?**
R:
- NÃO! Depois que fizer deploy, pode desligar seu PC
- O servidor VPS fica ligado 24/7 na Hostinger

**P: Como sei se o comando está rodando no servidor?**
R:
- Se você está na TELA PRETA do PuTTY = servidor
- Se você está no Windows/Desktop = seu PC

---

**Ficou claro agora?** 😊

Qualquer dúvida, me pergunte! 🚀
