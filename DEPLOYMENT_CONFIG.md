# 🚀 CONFIGURAÇÃO DE DEPLOY - LUXEPASS

## 📋 ARQUITETURA DE SUBDOMÍNIOS

### **Subdomínios Configurados:**

| Interface | Subdomínio | Tipo | Plataforma |
|-----------|-----------|------|------------|
| **Cliente** | `app.luxepass.com.br` | App Móvel | iOS + Android + Web |
| **Admin** | `suporte.luxepass.com.br` | App Móvel | iOS + Android + Web |
| **Nutricionista** | `nutri.luxepass.com.br` | App Móvel | iOS + Android + Web |
| **Personal Trainer** | `personal.luxepass.com.br` | App Móvel | iOS + Android + Web |
| **Academia** | `academias.luxepass.com.br` | Web App | Web apenas |
| **Backend API** | `api.luxepass.com.br` | API REST | Servidor |
| **Site Principal** | `www.luxepass.com.br` | Site | Institucional (não mexer) |

---

## 🔧 CONFIGURAÇÃO DO BACKEND

### **1. Variáveis de Ambiente - Produção**

Criar arquivo `/app/backend/.env.production`:

```bash
# MongoDB Produção
MONGO_URL=mongodb://seu_servidor_mongo:27017
DB_NAME=luxepass_production

# Pagar.me Produção
PAGARME_SECRET_KEY=sk_live_SUA_CHAVE_PRODUCAO
PAGARME_PUBLIC_KEY=pk_live_SUA_CHAVE_PRODUCAO

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# Agora.io Video
AGORA_APP_ID=seu_app_id_producao
AGORA_APP_CERTIFICATE=seu_certificate_producao

# CORS - Permitir todos os subdomínios
ALLOWED_ORIGINS=https://app.luxepass.com.br,https://suporte.luxepass.com.br,https://nutri.luxepass.com.br,https://personal.luxepass.com.br,https://academias.luxepass.com.br

# URL da API
API_URL=https://api.luxepass.com.br
```

### **2. Configuração NGINX (Servidor Backend)**

```nginx
# Backend API
server {
    listen 80;
    server_name api.luxepass.com.br;

    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **3. Configuração SSL (Certbot)**

```bash
# Instalar certbot
sudo apt-get install certbot python3-certbot-nginx

# Gerar certificados para todos os domínios
sudo certbot --nginx -d api.luxepass.com.br
sudo certbot --nginx -d app.luxepass.com.br
sudo certbot --nginx -d suporte.luxepass.com.br
sudo certbot --nginx -d nutri.luxepass.com.br
sudo certbot --nginx -d personal.luxepass.com.br
sudo certbot --nginx -d academias.luxepass.com.br
```

---

## 📱 CONFIGURAÇÃO DO FRONTEND

### **1. Variáveis de Ambiente por Subdomínio**

#### **app.luxepass.com.br (Cliente)**
```bash
# /app/frontend/.env.app
EXPO_PUBLIC_API_URL=https://api.luxepass.com.br/api
EXPO_PUBLIC_APP_NAME=LuxePass
EXPO_PUBLIC_BUNDLE_ID=com.luxepass.client
EXPO_PUBLIC_DEFAULT_ROUTE=/client/(tabs)
```

#### **suporte.luxepass.com.br (Admin)**
```bash
# /app/frontend/.env.admin
EXPO_PUBLIC_API_URL=https://api.luxepass.com.br/api
EXPO_PUBLIC_APP_NAME=LuxePass Admin
EXPO_PUBLIC_BUNDLE_ID=com.luxepass.admin
EXPO_PUBLIC_DEFAULT_ROUTE=/admin/(tabs)
```

#### **nutri.luxepass.com.br (Nutricionista)**
```bash
# /app/frontend/.env.nutri
EXPO_PUBLIC_API_URL=https://api.luxepass.com.br/api
EXPO_PUBLIC_APP_NAME=LuxePass Nutricionista
EXPO_PUBLIC_BUNDLE_ID=com.luxepass.nutritionist
EXPO_PUBLIC_DEFAULT_ROUTE=/professional/nutritionist/(tabs)
```

#### **personal.luxepass.com.br (Personal Trainer)**
```bash
# /app/frontend/.env.personal
EXPO_PUBLIC_API_URL=https://api.luxepass.com.br/api
EXPO_PUBLIC_APP_NAME=LuxePass Personal
EXPO_PUBLIC_BUNDLE_ID=com.luxepass.personal
EXPO_PUBLIC_DEFAULT_ROUTE=/professional/personal/(tabs)
```

#### **academias.luxepass.com.br (Academia)**
```bash
# /app/frontend/.env.gym
EXPO_PUBLIC_API_URL=https://api.luxepass.com.br/api
EXPO_PUBLIC_APP_NAME=LuxePass Academia
EXPO_PUBLIC_BUNDLE_ID=com.luxepass.gym
EXPO_PUBLIC_DEFAULT_ROUTE=/gym
```

---

## 🏗️ BUILDS PARA PRODUÇÃO

### **1. Build Web (Para cada subdomínio)**

```bash
# Cliente (app.luxepass.com.br)
cd /app/frontend
cp .env.app .env
npx expo export:web
# Arquivos gerados em: web-build/

# Admin (suporte.luxepass.com.br)
cp .env.admin .env
npx expo export:web
# Deploy web-build/ para suporte.luxepass.com.br

# Nutricionista (nutri.luxepass.com.br)
cp .env.nutri .env
npx expo export:web
# Deploy web-build/ para nutri.luxepass.com.br

# Personal (personal.luxepass.com.br)
cp .env.personal .env
npx expo export:web
# Deploy web-build/ para personal.luxepass.com.br

# Academia (academias.luxepass.com.br)
cp .env.gym .env
npx expo export:web
# Deploy web-build/ para academias.luxepass.com.br
```

### **2. Build Android (APK/AAB)**

```bash
# Cliente
cd /app/frontend
cp .env.app .env
eas build --platform android --profile production

# Admin
cp .env.admin .env
eas build --platform android --profile production

# Nutricionista
cp .env.nutri .env
eas build --platform android --profile production

# Personal
cp .env.personal .env
eas build --platform android --profile production
```

### **3. Build iOS (IPA)**

```bash
# Cliente
cd /app/frontend
cp .env.app .env
eas build --platform ios --profile production

# Admin
cp .env.admin .env
eas build --platform ios --profile production

# Nutricionista
cp .env.nutri .env
eas build --platform ios --profile production

# Personal
cp .env.personal .env
eas build --platform ios --profile production
```

---

## 🌐 CONFIGURAÇÃO NGINX (Frontend)

### **Configuração para cada subdomínio:**

```nginx
# Cliente - app.luxepass.com.br
server {
    listen 80;
    server_name app.luxepass.com.br;
    root /var/www/luxepass/app/web-build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Admin - suporte.luxepass.com.br
server {
    listen 80;
    server_name suporte.luxepass.com.br;
    root /var/www/luxepass/admin/web-build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Nutricionista - nutri.luxepass.com.br
server {
    listen 80;
    server_name nutri.luxepass.com.br;
    root /var/www/luxepass/nutri/web-build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Personal - personal.luxepass.com.br
server {
    listen 80;
    server_name personal.luxepass.com.br;
    root /var/www/luxepass/personal/web-build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Academia - academias.luxepass.com.br
server {
    listen 80;
    server_name academias.luxepass.com.br;
    root /var/www/luxepass/gym/web-build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📲 PUBLICAÇÃO NAS LOJAS

### **Google Play Store (Android)**

1. **Criar 4 apps separados:**
   - LuxePass (Cliente) - `com.luxepass.client`
   - LuxePass Admin - `com.luxepass.admin`
   - LuxePass Nutricionista - `com.luxepass.nutritionist`
   - LuxePass Personal - `com.luxepass.personal`

2. **Comando para gerar AAB:**
```bash
eas build --platform android --profile production
```

3. **Upload no Google Play Console**

### **Apple App Store (iOS)**

1. **Criar 4 apps separados no App Store Connect:**
   - LuxePass (Cliente)
   - LuxePass Admin
   - LuxePass Nutricionista
   - LuxePass Personal

2. **Comando para gerar IPA:**
```bash
eas build --platform ios --profile production
```

3. **Upload via Transporter ou Xcode**

---

## 🔐 DNS - CONFIGURAÇÃO DE SUBDOMÍNIOS

### **Registros A necessários (no painel do seu provedor DNS):**

```
Tipo  | Nome       | Valor (IP do servidor)
------|------------|----------------------
A     | api        | XXX.XXX.XXX.XXX
A     | app        | XXX.XXX.XXX.XXX
A     | suporte    | XXX.XXX.XXX.XXX
A     | nutri      | XXX.XXX.XXX.XXX
A     | personal   | XXX.XXX.XXX.XXX
A     | academias  | XXX.XXX.XXX.XXX
```

---

## 📦 ESTRUTURA DE PASTAS NO SERVIDOR

```
/var/www/luxepass/
├── api/                    # Backend FastAPI
│   ├── server.py
│   ├── .env
│   └── ...
├── app/web-build/          # Cliente (app.luxepass.com.br)
├── admin/web-build/        # Admin (suporte.luxepass.com.br)
├── nutri/web-build/        # Nutricionista (nutri.luxepass.com.br)
├── personal/web-build/     # Personal (personal.luxepass.com.br)
└── gym/web-build/          # Academia (academias.luxepass.com.br)
```

---

## 🚀 DEPLOY STEP-BY-STEP

### **1. Preparar Backend:**
```bash
# No servidor de produção
cd /var/www/luxepass/api
git pull origin main
pip install -r requirements.txt
cp .env.production .env
sudo systemctl restart luxepass-backend
```

### **2. Gerar Builds Web:**
```bash
# Na sua máquina local
cd /app/frontend

# Cliente
cp .env.app .env && npx expo export:web
scp -r web-build/* usuario@servidor:/var/www/luxepass/app/web-build/

# Admin
cp .env.admin .env && npx expo export:web
scp -r web-build/* usuario@servidor:/var/www/luxepass/admin/web-build/

# Nutricionista
cp .env.nutri .env && npx expo export:web
scp -r web-build/* usuario@servidor:/var/www/luxepass/nutri/web-build/

# Personal
cp .env.personal .env && npx expo export:web
scp -r web-build/* usuario@servidor:/var/www/luxepass/personal/web-build/

# Academia
cp .env.gym .env && npx expo export:web
scp -r web-build/* usuario@servidor:/var/www/luxepass/gym/web-build/
```

### **3. Configurar SSL:**
```bash
sudo certbot --nginx -d api.luxepass.com.br -d app.luxepass.com.br -d suporte.luxepass.com.br -d nutri.luxepass.com.br -d personal.luxepass.com.br -d academias.luxepass.com.br
```

### **4. Reiniciar NGINX:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ CHECKLIST DE DEPLOY

- [ ] DNS configurado (registros A para todos os subdomínios)
- [ ] Servidor configurado com NGINX
- [ ] Backend rodando em api.luxepass.com.br
- [ ] MongoDB configurado (produção)
- [ ] Certificados SSL instalados (Let's Encrypt)
- [ ] Builds web gerados para cada interface
- [ ] Arquivos copiados para /var/www/luxepass/
- [ ] Apps Android publicados na Google Play
- [ ] Apps iOS publicados na App Store
- [ ] Pagar.me em modo produção
- [ ] Testes completos em cada subdomínio

---

## 🆘 SUPORTE E MANUTENÇÃO

### **Logs do Backend:**
```bash
sudo journalctl -u luxepass-backend -f
```

### **Logs do NGINX:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### **Atualizar Deploy:**
```bash
# Backend
cd /var/www/luxepass/api && git pull && sudo systemctl restart luxepass-backend

# Frontend
# Gerar novo build e copiar arquivos
```

---

**✅ Sistema pronto para produção com arquitetura multi-subdomínio!**
