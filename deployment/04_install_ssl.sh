#!/bin/bash

# Script de Instalação SSL - LuxePass
# Instala certificados SSL gratuitos via Let's Encrypt

set -e

echo "===================================================="
echo "🔒 LuxePass - Instalação de Certificados SSL"
echo "===================================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Este processo instalará SSL para todos os subdomínios${NC}"
echo ""
read -p "Digite seu email para o Let's Encrypt: " EMAIL

echo -e "${GREEN}[1/5] Instalando SSL para api.luxepass.com.br...${NC}"
certbot --nginx -d api.luxepass.com.br --non-interactive --agree-tos --email $EMAIL --redirect

echo -e "${GREEN}[2/5] Instalando SSL para app.luxepass.com.br...${NC}"
certbot --nginx -d app.luxepass.com.br --non-interactive --agree-tos --email $EMAIL --redirect

echo -e "${GREEN}[3/5] Instalando SSL para profissional.luxepass.com.br...${NC}"
certbot --nginx -d profissional.luxepass.com.br --non-interactive --agree-tos --email $EMAIL --redirect

echo -e "${GREEN}[4/5] Instalando SSL para admin.luxepass.com.br...${NC}"
certbot --nginx -d admin.luxepass.com.br --non-interactive --agree-tos --email $EMAIL --redirect

echo -e "${GREEN}[5/5] Instalando SSL para suporte.luxepass.com.br...${NC}"
certbot --nginx -d suporte.luxepass.com.br --non-interactive --agree-tos --email $EMAIL --redirect

echo -e "${GREEN}Configurando renovação automática...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "===================================================="
echo -e "${GREEN}✅ Certificados SSL Instalados!${NC}"
echo "===================================================="
echo ""
echo "Todos os domínios agora usam HTTPS:"
echo "✅ https://api.luxepass.com.br"
echo "✅ https://app.luxepass.com.br"
echo "✅ https://profissional.luxepass.com.br"
echo "✅ https://admin.luxepass.com.br"
echo "✅ https://suporte.luxepass.com.br"
echo ""
echo "Certificados renovam automaticamente a cada 90 dias!"
echo "===================================================="
