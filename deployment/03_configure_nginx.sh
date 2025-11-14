#!/bin/bash

# Script de Configuração Nginx - LuxePass
# Configura proxy reverso e subdomínios

set -e

echo "===================================================="
echo "🌐 LuxePass - Configuração Nginx e Domínios"
echo "===================================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  IMPORTANTE - Configuração DNS${NC}"
echo ""
echo "Antes de continuar, configure no painel DNS da Hostinger:"
echo ""
echo "Tipo  | Nome         | Conteúdo          | TTL"
echo "------|--------------|-------------------|-----"
echo "A     | api          | 145.223.29.167    | 3600"
echo "A     | app          | 145.223.29.167    | 3600"
echo "A     | profissional | 145.223.29.167    | 3600"
echo "A     | admin        | 145.223.29.167    | 3600"
echo "A     | suporte      | 145.223.29.167    | 3600"
echo ""
echo "Aguarde 5-10 minutos para propagar!"
echo ""
read -p "Pressione ENTER quando tiver configurado o DNS..."

echo -e "${GREEN}[1/6] Configurando api.luxepass.com.br...${NC}"
cat > /etc/nginx/sites-available/api.luxepass.com.br << 'EOF'
server {
    listen 80;
    server_name api.luxepass.com.br;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo -e "${GREEN}[2/6] Configurando app.luxepass.com.br...${NC}"
cat > /etc/nginx/sites-available/app.luxepass.com.br << 'EOF'
server {
    listen 80;
    server_name app.luxepass.com.br;

    root /var/www/luxepass/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo -e "${GREEN}[3/6] Configurando profissional.luxepass.com.br...${NC}"
cat > /etc/nginx/sites-available/profissional.luxepass.com.br << 'EOF'
server {
    listen 80;
    server_name profissional.luxepass.com.br;

    root /var/www/luxepass/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo -e "${GREEN}[4/6] Configurando admin.luxepass.com.br...${NC}"
cat > /etc/nginx/sites-available/admin.luxepass.com.br << 'EOF'
server {
    listen 80;
    server_name admin.luxepass.com.br;

    root /var/www/luxepass/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo -e "${GREEN}[5/6] Configurando suporte.luxepass.com.br...${NC}"
cat > /etc/nginx/sites-available/suporte.luxepass.com.br << 'EOF'
server {
    listen 80;
    server_name suporte.luxepass.com.br;

    root /var/www/luxepass/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo -e "${GREEN}[6/6] Ativando sites e reiniciando Nginx...${NC}"
ln -sf /etc/nginx/sites-available/api.luxepass.com.br /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/app.luxepass.com.br /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/profissional.luxepass.com.br /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/admin.luxepass.com.br /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/suporte.luxepass.com.br /etc/nginx/sites-enabled/

# Remover configuração padrão
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx

echo ""
echo "===================================================="
echo -e "${GREEN}✅ Nginx Configurado!${NC}"
echo "===================================================="
echo ""
echo "Próximo passo: Execute o script 04_install_ssl.sh"
echo "===================================================="
