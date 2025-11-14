#!/bin/bash

# Script de Deploy - LuxePass
# Faz upload e configuração da aplicação

set -e

echo "===================================================="
echo "🚀 LuxePass - Deploy da Aplicação"
echo "===================================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Criar diretórios
echo -e "${GREEN}[1/8] Criando estrutura de diretórios...${NC}"
mkdir -p /var/www/luxepass
cd /var/www/luxepass

echo -e "${GREEN}[2/8] Criando diretório do backend...${NC}"
mkdir -p backend

echo -e "${YELLOW}ATENÇÃO: Agora você precisa fazer upload dos arquivos!${NC}"
echo ""
echo "Opções para upload:"
echo "1. Via SCP do seu computador:"
echo "   scp -r /caminho/do/seu/projeto/backend/* root@145.223.29.167:/var/www/luxepass/backend/"
echo ""
echo "2. Via Git (se tiver repositório):"
echo "   cd /var/www/luxepass && git clone seu-repositorio.git ."
echo ""
echo "3. Via FTP/SFTP usando FileZilla ou WinSCP"
echo ""
read -p "Pressione ENTER quando tiver feito upload dos arquivos..."

echo -e "${GREEN}[3/8] Instalando dependências Python...${NC}"
cd /var/www/luxepass/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn pymongo python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv bcrypt pydantic email-validator

echo -e "${GREEN}[4/8] Configurando variáveis de ambiente do backend...${NC}"
cat > /var/www/luxepass/backend/.env << 'EOF'
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=luxepass

# JWT Configuration
SECRET_KEY=luxepass-super-secret-key-change-this-in-production-2025
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# API Configuration
API_HOST=0.0.0.0
API_PORT=8001
EOF

echo -e "${GREEN}[5/8] Criando serviço systemd para o backend...${NC}"
cat > /etc/systemd/system/luxepass-backend.service << 'EOF'
[Unit]
Description=LuxePass Backend API
After=network.target mongodb.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/luxepass/backend
Environment="PATH=/var/www/luxepass/backend/venv/bin"
ExecStart=/var/www/luxepass/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}[6/8] Instalando dependências do frontend (Expo)...${NC}"
cd /var/www/luxepass
mkdir -p frontend
echo -e "${YELLOW}Upload os arquivos do frontend para /var/www/luxepass/frontend/${NC}"
read -p "Pressione ENTER quando tiver feito upload do frontend..."

cd /var/www/luxepass/frontend
npm install -g yarn expo-cli
yarn install

echo -e "${GREEN}[7/8] Configurando variáveis de ambiente do frontend...${NC}"
cat > /var/www/luxepass/frontend/.env << 'EOF'
EXPO_PUBLIC_API_URL=https://api.luxepass.com.br
EOF

echo -e "${GREEN}[8/8] Iniciando serviços...${NC}"
systemctl daemon-reload
systemctl enable luxepass-backend
systemctl start luxepass-backend

echo ""
echo "===================================================="
echo -e "${GREEN}✅ Deploy da Aplicação Completo!${NC}"
echo "===================================================="
echo ""
echo "Status dos serviços:"
systemctl status luxepass-backend --no-pager
echo ""
echo "Próximo passo: Execute o script 03_configure_nginx.sh"
echo "===================================================="
