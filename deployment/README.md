# 🚀 LuxePass - Guia de Deploy no VPS Hostinger

## 📋 Informações do Servidor

```
IP: 145.223.29.167
Usuário: root
Senha: 279717@Luxepass
RAM: 4GB
CPU: 1 core
Disco: 50GB SSD
Banda: 4TB/mês
```

## 🎯 Domínios Configurados

- `api.luxepass.com.br` → Backend API (FastAPI)
- `app.luxepass.com.br` → App Cliente
- `profissional.luxepass.com.br` → Nutricionista + Personal Trainer
- `admin.luxepass.com.br` → Painel Admin
- `suporte.luxepass.com.br` → Todas interfaces (manutenção)

## 📖 Passo a Passo Completo

### 1️⃣ Conectar no VPS

```bash
ssh root@145.223.29.167
# Senha: 279717@Luxepass
```

### 2️⃣ Fazer Upload dos Scripts

**Opção A - Via SCP (do seu computador local):**
```bash
# Do seu computador, navegue até a pasta do projeto
cd /caminho/do/projeto

# Upload dos scripts
scp -r deployment/* root@145.223.29.167:/root/
```

**Opção B - Criar manualmente no VPS:**
```bash
# Já conectado no VPS
mkdir -p /root/deployment
cd /root/deployment

# Baixar os arquivos (se estiverem em repositório Git)
# OU copiar e colar o conteúdo de cada script
```

### 3️⃣ Executar Scripts em Ordem

```bash
cd /root/deployment

# Dar permissão de execução
chmod +x *.sh

# 1. Instalar dependências (Python, Node.js, MongoDB, Nginx)
./01_install_dependencies.sh

# 2. Deploy da aplicação
# ANTES: Faça upload do código do backend e frontend!
./02_deploy_luxepass.sh

# 3. Configurar Nginx e domínios
# ANTES: Configure o DNS na Hostinger (veja seção DNS abaixo)
./03_configure_nginx.sh

# 4. Instalar certificados SSL
./04_install_ssl.sh

# 5. Gerenciar serviços (quando precisar)
./05_manage_services.sh
```

## 🌐 Configuração DNS na Hostinger

**IMPORTANTE:** Configure no painel DNS da Hostinger ANTES de executar o script 03:

1. Acesse: https://hpanel.hostinger.com
2. Vá em: Domínios → luxepass.com.br → DNS/Nameservers
3. Adicione os seguintes registros A:

```
Tipo | Nome         | Conteúdo       | TTL
-----|--------------|----------------|-----
A    | api          | 145.223.29.167 | 3600
A    | app          | 145.223.29.167 | 3600
A    | profissional | 145.223.29.167 | 3600
A    | admin        | 145.223.29.167 | 3600
A    | suporte      | 145.223.29.167 | 3600
```

4. Aguarde 5-10 minutos para propagação
5. Teste com: `ping api.luxepass.com.br`

## 📦 Upload da Aplicação

### Backend

```bash
# Do seu computador local
cd /caminho/do/projeto
scp -r backend/* root@145.223.29.167:/var/www/luxepass/backend/
```

### Frontend

```bash
# Do seu computador local
cd /caminho/do/projeto
scp -r frontend/* root@145.223.29.167:/var/www/luxepass/frontend/
```

## 🔧 Comandos Úteis

### Ver Status dos Serviços
```bash
systemctl status luxepass-backend
systemctl status mongod
systemctl status nginx
```

### Reiniciar Serviços
```bash
systemctl restart luxepass-backend
systemctl restart nginx
```

### Ver Logs
```bash
# Backend
journalctl -u luxepass-backend -f

# Nginx
tail -f /var/log/nginx/error.log

# MongoDB
tail -f /var/log/mongodb/mongod.log
```

### Backup do Banco de Dados
```bash
mkdir -p /root/backups
mongodump --db=luxepass --archive=/root/backups/luxepass_$(date +%Y%m%d).gz --gzip
```

### Restaurar Backup
```bash
mongorestore --db=luxepass --archive=/root/backups/luxepass_YYYYMMDD.gz --gzip
```

## 🔒 Segurança

### Trocar Senha Root (RECOMENDADO)
```bash
passwd root
# Digite nova senha forte
```

### Criar Usuário Não-Root
```bash
adduser deploy
usermod -aG sudo deploy

# Desabilitar login root via SSH (opcional)
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### Configurar Chave SSH (mais seguro)
```bash
# No seu computador local
ssh-keygen -t rsa -b 4096
ssh-copy-id root@145.223.29.167

# Agora pode conectar sem senha!
ssh root@145.223.29.167
```

## 🧪 Testes

### Testar API
```bash
curl https://api.luxepass.com.br/
curl https://api.luxepass.com.br/health
```

### Testar Domínios
```bash
curl -I https://app.luxepass.com.br
curl -I https://profissional.luxepass.com.br
curl -I https://admin.luxepass.com.br
```

## ❌ Troubleshooting

### Erro 502 Bad Gateway
```bash
# Verificar se backend está rodando
systemctl status luxepass-backend

# Ver logs de erro
journalctl -u luxepass-backend -n 50

# Reiniciar
systemctl restart luxepass-backend
```

### Erro de Conexão MongoDB
```bash
# Verificar MongoDB
systemctl status mongod

# Testar conexão
mongo --eval "db.runCommand({ connectionStatus: 1 })"
```

### SSL não funciona
```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew --force-renewal
```

## 📊 Monitoramento

### Uso de Recursos
```bash
# CPU e Memória
htop

# Disco
df -h

# Tráfego de rede
iftop
```

## 🔄 Atualização da Aplicação

```bash
# 1. Fazer backup
mongodump --db=luxepass --archive=/root/backups/backup_pre_update.gz --gzip

# 2. Upload novos arquivos
# scp ...

# 3. Atualizar dependências
cd /var/www/luxepass/backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# 4. Reiniciar
systemctl restart luxepass-backend

# 5. Verificar
systemctl status luxepass-backend
```

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs primeiro
2. Execute o script de gerenciamento: `./05_manage_services.sh`
3. Consulte a documentação

---

**Última atualização:** 2025-06-14
**Versão:** 1.0.0
