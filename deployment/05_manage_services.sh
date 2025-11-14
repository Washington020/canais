#!/bin/bash

# Script de Gerenciamento - LuxePass
# Comandos úteis para gerenciar os serviços

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "===================================================="
echo "🔧 LuxePass - Gerenciamento de Serviços"
echo "===================================================="
echo ""
echo "Escolha uma opção:"
echo ""
echo "1) Status de todos os serviços"
echo "2) Reiniciar Backend"
echo "3) Reiniciar Nginx"
echo "4) Reiniciar MongoDB"
echo "5) Ver logs do Backend"
echo "6) Ver logs do Nginx"
echo "7) Ver logs do MongoDB"
echo "8) Atualizar aplicação"
echo "9) Backup do banco de dados"
echo "10) Sair"
echo ""
read -p "Opção: " choice

case $choice in
    1)
        echo -e "${GREEN}Status dos Serviços:${NC}"
        echo ""
        echo "=== Backend ==="
        systemctl status luxepass-backend --no-pager
        echo ""
        echo "=== MongoDB ==="
        systemctl status mongod --no-pager
        echo ""
        echo "=== Nginx ==="
        systemctl status nginx --no-pager
        ;;
    2)
        echo -e "${GREEN}Reiniciando Backend...${NC}"
        systemctl restart luxepass-backend
        echo -e "${GREEN}✅ Backend reiniciado!${NC}"
        systemctl status luxepass-backend --no-pager
        ;;
    3)
        echo -e "${GREEN}Reiniciando Nginx...${NC}"
        systemctl restart nginx
        echo -e "${GREEN}✅ Nginx reiniciado!${NC}"
        systemctl status nginx --no-pager
        ;;
    4)
        echo -e "${GREEN}Reiniciando MongoDB...${NC}"
        systemctl restart mongod
        echo -e "${GREEN}✅ MongoDB reiniciado!${NC}"
        systemctl status mongod --no-pager
        ;;
    5)
        echo -e "${GREEN}Logs do Backend (últimas 50 linhas):${NC}"
        journalctl -u luxepass-backend -n 50 --no-pager
        ;;
    6)
        echo -e "${GREEN}Logs do Nginx:${NC}"
        tail -50 /var/log/nginx/error.log
        ;;
    7)
        echo -e "${GREEN}Logs do MongoDB:${NC}"
        tail -50 /var/log/mongodb/mongod.log
        ;;
    8)
        echo -e "${YELLOW}Atualizando aplicação...${NC}"
        cd /var/www/luxepass/backend
        git pull || echo "Faça upload manual dos arquivos"
        source venv/bin/activate
        pip install -r requirements.txt --upgrade
        systemctl restart luxepass-backend
        echo -e "${GREEN}✅ Aplicação atualizada!${NC}"
        ;;
    9)
        echo -e "${GREEN}Fazendo backup do MongoDB...${NC}"
        mkdir -p /root/backups
        BACKUP_FILE="/root/backups/luxepass_$(date +%Y%m%d_%H%M%S).gz"
        mongodump --db=luxepass --archive=$BACKUP_FILE --gzip
        echo -e "${GREEN}✅ Backup salvo em: $BACKUP_FILE${NC}"
        ls -lh $BACKUP_FILE
        ;;
    10)
        echo "Saindo..."
        exit 0
        ;;
    *)
        echo -e "${RED}Opção inválida!${NC}"
        ;;
esac
