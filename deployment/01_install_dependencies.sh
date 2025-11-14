#!/bin/bash

# Script de Instalação - LuxePass VPS
# Sistema: Ubuntu 20.04/22.04/24.04
# Hardware: 1 CPU, 4GB RAM, 50GB SSD

set -e  # Parar em caso de erro

echo "===================================================="
echo "🚀 LuxePass - Instalação de Dependências VPS"
echo "===================================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}[1/8] Atualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}[2/8] Instalando utilitários básicos...${NC}"
apt install -y curl wget git vim ufw build-essential software-properties-common

echo -e "${GREEN}[3/8] Instalando Python 3.11...${NC}"
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Definir Python 3.11 como padrão
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
update-alternatives --set python3 /usr/bin/python3.11

echo -e "${GREEN}[4/8] Instalando Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}[5/8] Instalando MongoDB 7.0...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Configurar MongoDB para usar menos memória (1 CPU)
cat > /etc/mongod.conf << 'EOF'
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
      
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOF

# Iniciar MongoDB
systemctl enable mongod
systemctl start mongod

echo -e "${GREEN}[6/8] Instalando Nginx...${NC}"
apt install -y nginx

echo -e "${GREEN}[7/8] Instalando Certbot (SSL gratuito)...${NC}"
apt install -y certbot python3-certbot-nginx

echo -e "${GREEN}[8/8] Configurando Firewall...${NC}"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw reload

echo ""
echo "===================================================="
echo -e "${GREEN}✅ Instalação de Dependências Completa!${NC}"
echo "===================================================="
echo ""
echo "Versões instaladas:"
echo "- Python: $(python3 --version)"
echo "- Node.js: $(node --version)"
echo "- MongoDB: $(mongod --version | head -1)"
echo "- Nginx: $(nginx -v 2>&1)"
echo ""
echo "Próximo passo: Execute o script 02_deploy_luxepass.sh"
echo "===================================================="
