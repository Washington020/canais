# 🎯 GUIA SUPER SIMPLES - Deploy LuxePass no VPS

## 📱 O QUE VOCÊ PRECISA

1. **PuTTY** (Windows) ou **Terminal** (Mac/Linux) - Para conectar no servidor
2. **WinSCP** ou **FileZilla** (Windows) - Para enviar arquivos
   - Download WinSCP: https://winscp.net/eng/download.php
   - Download FileZilla: https://filezilla-project.org/
3. **Acesso ao painel Hostinger** - Para configurar DNS

---

## 🚀 PASSO 1: CONECTAR NO SERVIDOR

### Se você usa WINDOWS:

1. **Baixe e instale o PuTTY:**
   - Link: https://www.putty.org/
   - Instale normalmente

2. **Abra o PuTTY:**
   - Host Name: `145.223.29.167`
   - Port: `22`
   - Connection type: `SSH`
   - Clique em **Open**

3. **Vai aparecer um alerta de segurança:**
   - Clique em **Sim** ou **Accept**

4. **Vai aparecer uma tela preta pedindo login:**
   - Digite: `root`
   - Aperte ENTER
   - Digite a senha: `279717@Luxepass`
   - Aperte ENTER
   - **NOTA:** A senha não aparece quando você digita (é normal!)

5. **Pronto! Você está conectado! 🎉**

---

### Se você usa MAC ou LINUX:

1. **Abra o Terminal:**
   - Mac: Spotlight (Cmd + Espaço) → digite "Terminal"
   - Linux: Ctrl + Alt + T

2. **Digite este comando:**
   ```bash
   ssh root@145.223.29.167
   ```

3. **Vai pedir senha:**
   - Digite: `279717@Luxepass`
   - Aperte ENTER
   - **NOTA:** A senha não aparece quando você digita!

4. **Pronto! Você está conectado! 🎉**

---

## 📦 PASSO 2: ENVIAR OS SCRIPTS PARA O SERVIDOR

### Opção A - Usando WinSCP (Windows - RECOMENDADO):

1. **Baixe e instale o WinSCP:**
   - Link: https://winscp.net/eng/download.php

2. **Abra o WinSCP e preencha:**
   ```
   File protocol: SFTP
   Host name: 145.223.29.167
   Port number: 22
   User name: root
   Password: 279717@Luxepass
   ```

3. **Clique em "Login"**

4. **Vai abrir duas janelas:**
   - ESQUERDA: Seu computador
   - DIREITA: O servidor VPS

5. **No lado ESQUERDO (seu computador):**
   - Navegue até onde você baixou este projeto
   - Encontre a pasta `/app/deployment`

6. **No lado DIREITO (servidor):**
   - Navegue até `/root/`

7. **Arraste a pasta `deployment` da ESQUERDA para a DIREITA**
   - Aguarde o upload terminar

8. **Pronto! Scripts enviados! ✅**

---

### Opção B - Usando FileZilla (Windows/Mac/Linux):

1. **Baixe e instale o FileZilla:**
   - Link: https://filezilla-project.org/

2. **Abra o FileZilla e preencha no topo:**
   ```
   Host: sftp://145.223.29.167
   Username: root
   Password: 279717@Luxepass
   Port: 22
   ```

3. **Clique em "Quickconnect"**

4. **Mesma lógica do WinSCP:**
   - ESQUERDA: Seu computador
   - DIREITA: Servidor
   - Arraste a pasta `deployment` para `/root/`

---

### Opção C - Via Linha de Comando (Mac/Linux):

1. **Abra o Terminal**

2. **Navegue até a pasta do projeto:**
   ```bash
   cd /caminho/onde/esta/o/projeto
   ```

3. **Execute o comando de upload:**
   ```bash
   scp -r deployment root@145.223.29.167:/root/
   ```

4. **Digite a senha quando pedir:**
   ```
   279717@Luxepass
   ```

---

## ⚙️ PASSO 3: EXECUTAR OS SCRIPTS (NO SERVIDOR)

**IMPORTANTE:** Agora você vai digitar comandos NA TELA PRETA do PuTTY/Terminal (servidor)

### 3.1 - Ir para a pasta dos scripts:

```bash
cd /root/deployment
```
Aperte ENTER

### 3.2 - Dar permissão de execução:

```bash
chmod +x *.sh
```
Aperte ENTER

### 3.3 - Executar Script 1 (Instalação):

```bash
./01_install_dependencies.sh
```
Aperte ENTER

**Aguarde terminar! Pode demorar 15-20 minutos**

Você verá mensagens como:
```
✅ [1/8] Atualizando sistema...
✅ [2/8] Instalando utilitários...
...
```

Quando aparecer:
```
✅ Instalação de Dependências Completa!
```

**Pronto! Continue para o próximo passo**

---

### 3.4 - Enviar código Backend e Frontend

**AGORA VOCÊ PRECISA ENVIAR OS ARQUIVOS DA APLICAÇÃO!**

Use o WinSCP/FileZilla novamente:

1. **Backend:**
   - No seu computador: Pasta `/app/backend` (todo conteúdo)
   - No servidor: Envie para `/var/www/luxepass/backend/`

2. **Frontend:**
   - No seu computador: Pasta `/app/frontend` (todo conteúdo)
   - No servidor: Envie para `/var/www/luxepass/frontend/`

**Como fazer:**
- Mesma coisa do PASSO 2
- Arraste as pastas pelo WinSCP/FileZilla
- Aguarde o upload (pode demorar 5-10 min)

---

### 3.5 - Executar Script 2 (Deploy):

**Volte para o PuTTY/Terminal**

```bash
./02_deploy_luxepass.sh
```
Aperte ENTER

**Script vai pedir confirmações:**
```
Pressione ENTER quando tiver feito upload dos arquivos...
```

Aperte ENTER cada vez que pedir

---

## 🌐 PASSO 4: CONFIGURAR DNS NA HOSTINGER

**ANTES de continuar, configure o DNS:**

1. **Acesse:** https://hpanel.hostinger.com

2. **Faça login**

3. **Vá em:** Domínios → `luxepass.com.br`

4. **Clique em:** DNS / Name Servers

5. **Adicione 5 registros do tipo "A":**

   **Registro 1:**
   - Tipo: `A`
   - Nome: `api`
   - Aponta para: `145.223.29.167`
   - TTL: `3600`

   **Registro 2:**
   - Tipo: `A`
   - Nome: `app`
   - Aponta para: `145.223.29.167`
   - TTL: `3600`

   **Registro 3:**
   - Tipo: `A`
   - Nome: `profissional`
   - Aponta para: `145.223.29.167`
   - TTL: `3600`

   **Registro 4:**
   - Tipo: `A`
   - Nome: `admin`
   - Aponta para: `145.223.29.167`
   - TTL: `3600`

   **Registro 5:**
   - Tipo: `A`
   - Nome: `suporte`
   - Aponta para: `145.223.29.167`
   - TTL: `3600`

6. **Salve todas as alterações**

7. **Aguarde 10-15 minutos** para o DNS propagar

8. **Teste se está funcionando:**
   - Abra o Terminal/PuTTY
   - Digite: `ping api.luxepass.com.br`
   - Se aparecer o IP `145.223.29.167` = FUNCIONOU! ✅

---

## 🔧 PASSO 5: CONFIGURAR NGINX

**Volte para o PuTTY/Terminal conectado no servidor**

```bash
./03_configure_nginx.sh
```
Aperte ENTER

Vai pedir para confirmar que configurou o DNS:
```
Pressione ENTER quando tiver configurado o DNS...
```

Aperte ENTER

---

## 🔒 PASSO 6: INSTALAR SSL (HTTPS)

```bash
./04_install_ssl.sh
```
Aperte ENTER

Vai pedir seu email:
```
Digite seu email para o Let's Encrypt:
```

Digite seu email e aperte ENTER

Exemplo: `seuemail@gmail.com`

**Aguarde! Vai instalar SSL para os 5 domínios**

---

## 🎉 PRONTO! APLICAÇÃO NO AR!

Teste acessando:

✅ https://api.luxepass.com.br
✅ https://app.luxepass.com.br
✅ https://profissional.luxepass.com.br
✅ https://admin.luxepass.com.br
✅ https://suporte.luxepass.com.br

---

## 🆘 PROBLEMAS COMUNS

### "Permission denied" ao executar script
**Solução:**
```bash
chmod +x /root/deployment/*.sh
```

### "Connection refused" no PuTTY
**Solução:**
- Verifique se o IP está correto: `145.223.29.167`
- Porta deve ser: `22`
- Tipo: `SSH`

### DNS não propaga
**Solução:**
- Aguarde mais tempo (até 24h em casos raros)
- Verifique se salvou corretamente no painel Hostinger
- Teste com: https://dnschecker.org/

### Script trava ou dá erro
**Solução:**
```bash
# Ver logs de erro
journalctl -xe

# Reiniciar e tentar novamente
```

---

## 📞 PRECISA DE AJUDA?

Se travou em algum passo, me informe:
1. Em qual passo você está
2. Qual mensagem de erro apareceu
3. Print da tela (se possível)

Vou te ajudar! 🚀

---

**Criado em:** 2025-06-14
**Versão:** 1.0 - Guia Simplificado
