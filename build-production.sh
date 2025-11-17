#!/bin/bash

# 🚀 Script de Build para Produção - LuxePass
# Este script gera todos os builds necessários para cada subdomínio

echo "🚀 Iniciando processo de build para produção..."
echo "================================================"

cd /app/frontend

# Criar diretório para builds
mkdir -p ../production-builds

# ========================================
# BUILD 1: Cliente (app.luxepass.com.br)
# ========================================
echo ""
echo "📱 1/5 - Building Cliente (app.luxepass.com.br)..."
cp .env.app .env
npx expo export:web --clear
mv web-build ../production-builds/app-web-build
echo "✅ Cliente build completo!"

# ========================================
# BUILD 2: Admin (suporte.luxepass.com.br)
# ========================================
echo ""
echo "👨‍💼 2/5 - Building Admin (suporte.luxepass.com.br)..."
cp .env.admin .env
npx expo export:web --clear
mv web-build ../production-builds/admin-web-build
echo "✅ Admin build completo!"

# ========================================
# BUILD 3: Nutricionista (nutri.luxepass.com.br)
# ========================================
echo ""
echo "🥗 3/5 - Building Nutricionista (nutri.luxepass.com.br)..."
cp .env.nutri .env
npx expo export:web --clear
mv web-build ../production-builds/nutri-web-build
echo "✅ Nutricionista build completo!"

# ========================================
# BUILD 4: Personal (personal.luxepass.com.br)
# ========================================
echo ""
echo "💪 4/5 - Building Personal (personal.luxepass.com.br)..."
cp .env.personal .env
npx expo export:web --clear
mv web-build ../production-builds/personal-web-build
echo "✅ Personal build completo!"

# ========================================
# BUILD 5: Academia (academias.luxepass.com.br)
# ========================================
echo ""
echo "🏋️ 5/5 - Building Academia (academias.luxepass.com.br)..."
cp .env.gym .env
npx expo export:web --clear
mv web-build ../production-builds/gym-web-build
echo "✅ Academia build completo!"

# Restaurar .env padrão
cp .env.development .env 2>/dev/null || echo "# Development" > .env

echo ""
echo "================================================"
echo "✅ TODOS OS BUILDS CONCLUÍDOS COM SUCESSO!"
echo "================================================"
echo ""
echo "📦 Builds disponíveis em: /app/production-builds/"
echo ""
echo "📁 Estrutura de pastas:"
echo "   - app-web-build/       → app.luxepass.com.br"
echo "   - admin-web-build/     → suporte.luxepass.com.br"
echo "   - nutri-web-build/     → nutri.luxepass.com.br"
echo "   - personal-web-build/  → personal.luxepass.com.br"
echo "   - gym-web-build/       → academias.luxepass.com.br"
echo ""
echo "🚀 Próximos passos:"
echo "1. Copiar os builds para o servidor"
echo "2. Configurar NGINX para cada subdomínio"
echo "3. Instalar certificados SSL"
echo ""
echo "📋 Comando para copiar para servidor:"
echo "   scp -r ../production-builds/* usuario@servidor:/var/www/luxepass/"
echo ""
