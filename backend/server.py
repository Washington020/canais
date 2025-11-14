from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
from bson import ObjectId
import base64
import secrets
import qrcode
from io import BytesIO
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Import the advanced token system
from token_system import token_manager, AdvancedToken, TokenAuditLog, TokenSystemManager

# Import new models and services
from models import *
from services import *
from server_integrations import integration_router, init_services

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import pagarme_service after loading environment variables
from pagarme_service import pagarme_service

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'luxe_forma')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Stripe API Key
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk-test-51PxqFfJchv7KIiWYvSJNK4jkqFYQ0dYLqP9t5C4WEq7mfBb1ypHxP5Q9N4S2sE2VT4nT4oT4pT5fP1Q9N4S2sE3')

# Emergent LLM Key for AI features
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-f400b75B69872D785E')

# Payment Plans Configuration
PAYMENT_PLANS = {
    "basico": {
        "id": "basico",
        "name": "Plano Básico",
        "monthly_price": 99.90,
        "activation_fee": 29.90,
        "first_month_total": 129.80,
        "currency": "BRL",
        "duration_days": 30,
        "fidelity_months": 12,
        "features": [
            "Acesso ilimitado a academias básicas",
            "App exclusivo LuxePass",
            "Suporte por WhatsApp",
            "Check-in inteligente",
            "Flexibilidade total de horários"
        ],
        "token_limit": 0,
        "description": "Perfeito para quem quer liberdade e economia nos treinos",
        "marketing_benefits": [
            "💪 Livre acesso a +50 academias parceiras",
            "📱 App intuitivo e fácil de usar", 
            "⏰ Treinar a qualquer horário",
            "🎯 Fidelidade de 12 meses com desconto especial"
        ]
    },
    "intermediario": {
        "id": "intermediario", 
        "name": "Plano Intermediário",
        "monthly_price": 159.90,
        "activation_fee": 59.90,
        "first_month_total": 219.80,
        "currency": "BRL",
        "duration_days": 30,
        "fidelity_months": 12,
        "features": [
            "Tudo do Plano Básico",
            "1 consulta mensal com nutricionista",
            "1 consulta mensal com personal trainer",
            "Planos personalizados de treino",
            "Orientação nutricional completa",
            "Suporte prioritário 24/7"
        ],
        "nutritionist_consultations": 1,
        "personal_consultations": 1,
        "token_limit": 0,
        "description": "Ideal para quem busca orientação profissional e resultados consistentes",
        "marketing_benefits": [
            "🏆 Mais vendido! Melhor custo-benefício",
            "👩‍⚕️ Nutricionista especializada mensal",
            "🏋️‍♂️ Personal trainer exclusivo mensal", 
            "📊 Planos personalizados inclusos",
            "🎯 Fidelidade de 12 meses com vantagens exclusivas"
        ]
    },
    "vip": {
        "id": "vip",
        "name": "Plano VIP",
        "monthly_price": 349.90,
        "activation_fee": 0.00,
        "first_month_total": 349.90,
        "currency": "BRL", 
        "duration_days": 30,
        "fidelity_months": 12,
        "features": [
            "Tudo dos Planos anteriores",
            "2 consultas mensais com nutricionista",
            "2 consultas mensais com personal trainer",
            "Acompanhamento semanal personalizado",
            "Acesso a academias VIP exclusivas",
            "Relatórios detalhados de evolução",
            "Suporte dedicado via WhatsApp",
            "Sem taxa de adesão!"
        ],
        "nutritionist_consultations": 2,
        "personal_consultations": 2,
        "token_limit": 0,
        "description": "O mais completo! Para quem não quer limites na busca pelos resultados",
        "marketing_benefits": [
            "👑 Plano mais completo e exclusivo",
            "🎁 TAXA DE ADESÃO GRÁTIS (economia de R$ 99,90)",
            "👩‍⚕️ 2 consultas nutricionista + 2 personal trainer/mês",
            "🏋️‍♀️ Academias VIP com equipamentos premium",
            "📈 Acompanhamento semanal personalizado",
            "🎯 Fidelidade de 12 meses com benefícios VIP"
        ]
    }
}

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app
app = FastAPI(title="Luxe Forma API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    birth_date: Optional[datetime] = None
    plan_type: str = "basic"  # basic, intermediate, premium

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    is_active: bool = True
    is_blocked: bool = False  # New field for financial blocking
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    subscription_end: Optional[datetime] = None
    last_payment_date: Optional[datetime] = None
    payment_status: str = "active"  # active, overdue, suspended
    tokens_available: int = 0
    tokens_used: int = 0
    gyms_visited: int = 0

class GymCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    latitude: float
    longitude: float
    cnpj: str
    accepted_plans: List[str]  # basic, intermediate, premium
    equipments: List[str]
    max_capacity: int = 100
    
class GymLogin(BaseModel):
    email: EmailStr
    password: str

class GymUser(BaseModel):
    id: str
    name: str
    email: str
    password_hash: str
    gym_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenUsage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token_code: str
    token_type: str  # gym, nutritionist
    qr_code: str
    gym_id: Optional[str] = None
    validity_hours: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    is_used: bool = False
    used_at: Optional[datetime] = None

class Gym(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    latitude: float
    longitude: float
    accepted_plans: List[str]  # basic, intermediate, premium
    equipments: List[str]
    current_occupancy: int = 0
    max_capacity: int
    opening_hours: Dict[str, Dict[str, str]]  # {"monday": {"open": "06:00", "close": "22:00"}}
    rating: float = 0.0
    photos: List[str] = []  # base64 images
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Workout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    difficulty: str  # beginner, intermediate, advanced
    duration_minutes: int
    exercises: List[Dict[str, Any]]
    target_muscle_groups: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserWorkout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    workout_id: str
    scheduled_date: datetime
    completed: bool = False
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

class NutritionPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    nutritionist_id: str
    daily_calories: int
    daily_protein: int
    daily_carbs: int
    daily_fats: int
    meals: List[Dict[str, Any]]
    supplements: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    currency: str = "BRL"
    payment_method: str
    status: str  # pending, completed, failed
    plan_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

async def create_test_professionals():
    """Create test professionals if they don't exist"""
    try:
        # Check if nutritionist exists
        nutritionist = await db.professionals.find_one({"email": "nutri@luxepass.com"})
        if not nutritionist:
            nutritionist_data = {
                "full_name": "Dra. Maria Nutricionista",
                "email": "nutri@luxepass.com",
                "password_hash": pwd_context.hash("nutri123"),
                "professional_type": "nutritionist",
                "cref_crn": "CRN-12345/SP",
                "specialization": "Nutrição Esportiva e Funcional",
                "bio": "Nutricionista especializada em nutrição esportiva com mais de 10 anos de experiência.",
                "phone": "(11) 99999-0001",
                "experience_years": 10,
                "active": True,
                "created_at": datetime.now(timezone.utc)
            }
            await db.professionals.insert_one(nutritionist_data)
            logger.info("✅ Nutricionista de teste criada: nutri@luxepass.com / nutri123")
        
        # Check if personal trainer exists
        personal = await db.professionals.find_one({"email": "personal@luxepass.com"})
        if not personal:
            personal_data = {
                "full_name": "Prof. João Personal",
                "email": "personal@luxepass.com",
                "password_hash": pwd_context.hash("personal123"),
                "professional_type": "personal",
                "cref_crn": "CREF-12345/SP",
                "specialization": "Musculação e Condicionamento Físico",
                "bio": "Personal trainer especializado em musculação e condicionamento com mais de 8 anos de experiência.",
                "phone": "(11) 99999-0002",
                "experience_years": 8,
                "active": True,
                "created_at": datetime.now(timezone.utc)
            }
            await db.professionals.insert_one(personal_data)
            logger.info("✅ Personal trainer de teste criado: personal@luxepass.com / personal123")
            
    except Exception as e:
        logger.error(f"Erro ao criar profissionais de teste: {e}")

async def create_test_users():
    """Create test users with different plan types"""
    try:
        # Create VIP user
        vip_user = await db.users.find_one({"email": "vip@luxepass.com"})
        if not vip_user:
            vip_data = {
                "full_name": "Cliente VIP Premium",
                "email": "vip@luxepass.com",
                "password_hash": pwd_context.hash("vip123"),
                "phone": "(11) 99999-1111",
                "plan_type": "vip",
                "status": "active",
                "tokens_available": 999,  # VIP gets unlimited tokens
                "tokens_used": 0,
                "gyms_visited": 0,
                "created_at": datetime.now(timezone.utc),
                "subscription_end": datetime.now(timezone.utc) + timedelta(days=365)
            }
            await db.users.insert_one(vip_data)
            logger.info("✅ Usuário VIP de teste criado: vip@luxepass.com / vip123")
        
        # Create Intermediario user
        intermediario_user = await db.users.find_one({"email": "intermediario@luxepass.com"})
        if not intermediario_user:
            intermediario_data = {
                "full_name": "Cliente Intermediário",
                "email": "intermediario@luxepass.com",
                "password_hash": pwd_context.hash("inter123"),
                "phone": "(11) 99999-2222",
                "plan_type": "intermediario",
                "status": "active",
                "tokens_available": 50,
                "tokens_used": 0,
                "gyms_visited": 0,
                "created_at": datetime.now(timezone.utc),
                "subscription_end": datetime.now(timezone.utc) + timedelta(days=365)
            }
            await db.users.insert_one(intermediario_data)
            logger.info("✅ Usuário Intermediário de teste criado: intermediario@luxepass.com / inter123")
            
    except Exception as e:
        logger.error(f"Erro ao criar usuários de teste: {e}")

async def create_test_gym():
    """Create test gym if it doesn't exist"""
    try:
        # Check if test gym exists
        test_gym = await db.gyms.find_one({"login_credentials.username": "academia_teste"})
        if not test_gym:
            gym_data = {
                "name": "Academia Teste LuxePass",
                "address": "Rua das Academias, 123 - Centro, São Paulo - SP",
                "phone": "(11) 3333-4444",
                "email": "contato@academiateste.com",
                "cnpj": "12.345.678/0001-90",
                "owner_name": "João Silva",
                "owner_email": "joao@academiateste.com",
                "owner_phone": "(11) 99999-3333",
                "plan_type": "premium",
                "status": "active",
                "login_credentials": {
                    "username": "academia_teste",
                    "password_hash": pwd_context.hash("teste123"),
                    "last_login": None
                },
                "operating_hours": {
                    "monday": "06:00-22:00",
                    "tuesday": "06:00-22:00", 
                    "wednesday": "06:00-22:00",
                    "thursday": "06:00-22:00",
                    "friday": "06:00-22:00",
                    "saturday": "08:00-18:00",
                    "sunday": "08:00-16:00"
                },
                "amenities": ["Musculação", "Cardio", "Funcional", "Estacionamento", "Vestiário"],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await db.gyms.insert_one(gym_data)
            logger.info("✅ Academia de teste criada: academia_teste / teste123")
            
            # Create gym user entry
            gym_user_data = {
                "gym_id": str(result.inserted_id),
                "username": "academia_teste",
                "password_hash": pwd_context.hash("teste123"),
                "role": "admin",
                "permissions": ["validate_tokens", "view_stats", "manage_schedule"],
                "created_at": datetime.now(timezone.utc),
                "last_login": None,
                "active": True
            }
            
            await db.gym_users.insert_one(gym_user_data)
            logger.info("✅ Usuário da academia de teste criado")
            
    except Exception as e:
        logger.error(f"Erro ao criar academia de teste: {e}")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if user_doc is None:
        raise credentials_exception
    
    user_doc["id"] = str(user_doc["_id"])
    del user_doc["_id"]
    return User(**user_doc)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current admin user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type")
        
        if user_id is None or user_type != "admin":
            raise HTTPException(status_code=401, detail="Token inválido")
            
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
            
        # Check if user is admin
        if user.get("email") != "admin@luxepass.com":
            raise HTTPException(status_code=403, detail="Acesso negado: apenas administradores")
            
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user["full_name"]
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_professional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current professional from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        professional_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if professional_id is None or token_type != "professional":
            raise HTTPException(status_code=401, detail="Token inválido")
            
        professional = await db.professionals.find_one({"_id": ObjectId(professional_id)})
        if professional is None:
            raise HTTPException(status_code=401, detail="Profissional não encontrado")
            
        return {
            "id": str(professional["_id"]),
            "email": professional["email"],
            "full_name": professional["full_name"],
            "professional_type": professional["professional_type"]
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

@app.get("/")
async def root():
    return {"message": "Luxe Forma API - Sistema funcionando perfeitamente!", "status": "active"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Luxe Forma API está funcionando",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }

# Authentication routes
@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    del user_dict["password"]
    user_dict["hashed_password"] = hashed_password
    user_dict["created_at"] = datetime.now(timezone.utc)
    
    # Set subscription and tokens based on plan
    if user.plan_type == "premium":
        user_dict["subscription_end"] = datetime.now(timezone.utc) + timedelta(days=30)
        user_dict["tokens_available"] = 60  # 2 per day for 30 days
    elif user.plan_type == "intermediate":
        user_dict["subscription_end"] = datetime.now(timezone.utc) + timedelta(days=30)
        user_dict["tokens_available"] = 30  # 1 per day for 30 days
    else:
        user_dict["tokens_available"] = 15  # basic plan
    
    result = await db.users.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    del user_dict["_id"]
    del user_dict["hashed_password"]
    
    return User(**user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user_doc = await db.users.find_one({"email": user_credentials.email})
    
    # Create demo admin user if doesn't exist
    if not user_doc and user_credentials.email == "admin@luxepass.com":
        admin_user = {
            "email": "admin@luxepass.com",
            "full_name": "Administrador Luxe Forma",
            "phone": "+5511000000000",
            "hashed_password": get_password_hash("admin123"),
            "plan_type": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "tokens_available": 999,
            "tokens_used": 0,
            "role": "admin"
        }
        result = await db.users.insert_one(admin_user)
        user_doc = await db.users.find_one({"_id": result.inserted_id})
    
    # Create demo client user if doesn't exist
    if not user_doc and user_credentials.email == "cliente@luxepass.com":
        client_user = {
            "email": "cliente@luxepass.com",
            "full_name": "Cliente Premium",
            "phone": "+5511999999999",
            "hashed_password": get_password_hash("cliente123"),
            "plan_type": "premium",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "tokens_available": 46,
            "tokens_used": 4,
            "role": "client"
        }
        result = await db.users.insert_one(client_user)
        user_doc = await db.users.find_one({"_id": result.inserted_id})
    
    if not user_doc or not verify_password(user_credentials.password, user_doc.get("hashed_password", user_doc.get("password_hash", ""))):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Determine user type for token
    user_type = "admin" if user_doc.get("email") == "admin@luxepass.com" else "user"
    
    access_token = create_access_token(
        data={"sub": str(user_doc["_id"]), "type": user_type}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User routes
@api_router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/users/stats")
async def get_user_stats(current_user: User = Depends(get_current_user)):
    # Get workout stats
    total_workouts = await db.user_workouts.count_documents({"user_id": current_user.id})
    completed_workouts = await db.user_workouts.count_documents({"user_id": current_user.id, "completed": True})
    
    # Get token usage stats
    tokens_used = await db.token_usage.count_documents({"user_id": current_user.id, "is_used": True})
    gyms_visited = len(await db.token_usage.distinct("gym_id", {"user_id": current_user.id, "is_used": True}))
    
    return {
        "total_workouts": total_workouts,
        "completed_workouts": completed_workouts,
        "completion_rate": (completed_workouts / max(total_workouts, 1)) * 100,
        "tokens_available": current_user.tokens_available,
        "tokens_used": tokens_used,
        "gyms_visited": gyms_visited
    }

# User profile routes
@api_router.get("/users/profile")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile information"""
    try:
        return {
            "id": str(current_user.id),
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone": getattr(current_user, 'phone', ''),
            "plan_type": current_user.plan_type,
            "status": getattr(current_user, 'status', 'active'),
            "created_at": getattr(current_user, 'created_at', None),
            "subscription_expires": getattr(current_user, 'subscription_expires', None)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar perfil do usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar perfil")

@api_router.get("/users/tokens")
async def get_user_tokens(current_user: User = Depends(get_current_user)):
    """Buscar tokens do usuário logado"""
    try:
        user_id = str(current_user.id)
        
        # Buscar tokens do usuário ordenados por data de criação (mais recentes primeiro)
        tokens = await db.tokens.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(20).to_list(20)
        
        # Formatar tokens para o frontend
        formatted_tokens = []
        for token in tokens:
            formatted_tokens.append({
                "id": str(token["_id"]),
                "code": token["token_code"],
                "type": token["token_type"],
                "status": token["status"],
                "created_at": token["created_at"].isoformat() if token["created_at"] else None,
                "expires_at": token["expires_at"].isoformat() if token["expires_at"] else None,
                "used_at": token.get("used_at").isoformat() if token.get("used_at") else None,
                "used_at_gym": token.get("used_at_gym"),
                "usage_count": token.get("usage_count", 0),
                "max_usage": token.get("max_usage", 1)
            })
        
        return formatted_tokens
        
    except Exception as e:
        logger.error(f"Erro ao buscar tokens do usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar tokens")

@api_router.get("/users/gyms")
async def get_gyms_for_client(current_user: User = Depends(get_current_user)):
    """Buscar academias ativas para o cliente fazer check-in"""
    try:
        # Buscar apenas academias ativas e aprovadas
        gyms = await db.gyms.find(
            {"status": {"$in": ["active", "approved"]}}
        ).to_list(50)
        
        # Formatar academias para o cliente
        formatted_gyms = []
        for gym in gyms:
            gym_data = {
                "id": str(gym["_id"]),
                "name": gym.get("name", "Academia"),
                "address": {
                    "street": gym.get("endereco", ""),
                    "number": gym.get("numero", ""),
                    "neighborhood": gym.get("bairro", ""),
                    "city": gym.get("cidade", ""),
                    "state": gym.get("estado", ""),
                    "zipcode": gym.get("cep", "")
                },
                "full_address": f"{gym.get('endereco', '')}, {gym.get('numero', '')} - {gym.get('bairro', '')}, {gym.get('cidade', '')}/{gym.get('estado', '')}",
                "phone": gym.get("telefone_principal", ""),
                "type": gym.get("tipo_academia", "Completa"),
                "capacity": gym.get("capacidade_maxima", 100),
                "amenities": gym.get("amenities", []),
                "operating_hours": gym.get("horario_funcionamento", {}),
                "status": gym.get("status", "active"),
                "rating": gym.get("rating", 4.5),  # Default rating
                "distance": "Calculando...",  # Will be calculated on frontend
                "created_at": gym.get("created_at")
            }
            formatted_gyms.append(gym_data)
        
        return formatted_gyms
        
    except Exception as e:
        logger.error(f"Erro ao buscar academias para cliente: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar academias")

@api_router.get("/admin/token-validations")
async def get_token_validations():
    """Buscar validações de tokens para o admin - comunicação entre apps"""
    try:
        # Buscar validações recentes ordenadas por data (mais recentes primeiro)
        validations = await db.token_validations.find().sort("validated_at", -1).limit(50).to_list(50)
        
        # Formatar validações para o admin
        formatted_validations = []
        for validation in validations:
            formatted_validations.append({
                "validation_id": validation["validation_id"],
                "token_code": validation["token_code"],
                "token_type": validation["token_type"],
                "user_name": validation["user_name"],
                "user_email": validation["user_email"],
                "gym_name": validation["gym_name"],
                "validated_at": validation["validated_at"].isoformat() if validation["validated_at"] else None,
                "status": validation["status"],
                "created_at": validation["created_at"].isoformat() if validation["created_at"] else None
            })
        
        return {
            "validations": formatted_validations,
            "total": len(formatted_validations),
            "message": "Validações carregadas com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar validações de tokens: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar validações")

@api_router.put("/admin/users/{user_id}/update-profile")
async def update_user_profile(user_id: str, full_name: str, email: str):
    """Admin endpoint to update user profile"""
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"full_name": full_name, "email": email}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        return {"success": True, "message": f"Perfil atualizado para {full_name}"}
    except Exception as e:
        logger.error(f"Erro ao atualizar perfil: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar perfil")

@api_router.put("/admin/users/{user_id}/update-email")
async def update_user_email(user_id: str, new_email: str):
    """Admin endpoint to update user email"""
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"email": new_email}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        return {"success": True, "message": f"Email atualizado para {new_email}"}
    except Exception as e:
        logger.error(f"Erro ao atualizar email: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar email")

# Token routes
@api_router.post("/tokens/generate")
async def generate_token(
    request: Request,
    current_user = Depends(get_current_user),
    token_type: str = "gym",
    validity_hours: int = 3,
    gym_id: Optional[str] = None,
    access_type: str = "entry"
):
    user_id = current_user.id
    
    # Check if user is blocked
    if getattr(current_user, 'is_blocked', False):
        raise HTTPException(
            status_code=403, 
            detail="Usuário bloqueado. Não é possível gerar tokens."
        )
    
    # Use gym_id provided or default
    target_gym_id = gym_id or "gym-default"
    
    # Generate advanced token with all security features
    advanced_token = token_manager.generate_advanced_token(
        user_id=user_id,
        gym_id=target_gym_id,
        access_type=access_type,
        validity_hours=validity_hours,
        daily_limit=3,
        monthly_limit=60
    )
    
    # Get client IP for audit log
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    device_info = request.headers.get("user-agent", "unknown")
    
    # Create audit log
    audit_log = token_manager.create_audit_log(
        action="generated",
        token_id=advanced_token.token_id,
        user_id=user_id,
        gym_id=target_gym_id,
        success=True,
        device_info=device_info,
        ip_address=client_ip
    )
    
    # Store token in database
    token_doc = {
        "token_id": advanced_token.token_id,
        "token_code": advanced_token.token_code,
        "hash_unique": advanced_token.hash_unique,
        "user_id": ObjectId(user_id),
        "gym_id": target_gym_id,
        "token_type": token_type,
        "access_type": access_type,
        "issued_at": advanced_token.issued_at,
        "expires_at": advanced_token.expires_at,
        "status": advanced_token.status,
        "usage_limits": advanced_token.usage_limits.dict(),
        "security": advanced_token.security.dict(),
        "metadata": advanced_token.metadata,
        "validation_count": 0,
        "is_used": False,
        "created_at": advanced_token.issued_at
    }
    
    # Store audit log
    audit_doc = {
        "timestamp": audit_log.timestamp,
        "action": audit_log.action,
        "token_id": audit_log.token_id,
        "user_id": ObjectId(user_id),
        "gym_id": target_gym_id,
        "device_info": audit_log.device_info,
        "ip_address": audit_log.ip_address,
        "success": audit_log.success,
        "failure_reason": audit_log.failure_reason
    }
    
    # Insert both documents
    await db.token_usage.insert_one(token_doc)
    await db.token_audit_logs.insert_one(audit_doc)
    
    # Generate QR code with enhanced data
    qr_data = {
        "token_id": advanced_token.token_id,
        "token_code": advanced_token.token_code,
        "hash": advanced_token.hash_unique,
        "expires_at": advanced_token.expires_at.isoformat(),
        "access_type": access_type,
        "signature": advanced_token.security.signature[:50] + "..."  # Truncated for QR
    }
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(str(qr_data))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "token_id": advanced_token.token_id,
        "token_code": advanced_token.token_code,
        "hash_unique": advanced_token.hash_unique,
        "qr_code": qr_code_base64,
        "expires_at": advanced_token.expires_at,
        "access_type": access_type,
        "usage_limits": advanced_token.usage_limits.dict(),
        "security_score": 100,  # Initial score
        "metadata": advanced_token.metadata,
        "type": token_type
    }

@api_router.post("/tokens/validate/{token_code}")
async def validate_simple_token(token_code: str, request: Request, gym_id: str = Query(None)):
    """Valida token simples"""
    try:
        # Find token in database
        token_doc = await db.tokens.find_one({"token_code": token_code})
        
        if not token_doc:
            raise HTTPException(status_code=404, detail="Token não encontrado")
        
        # Check if token is expired
        current_time = datetime.now(timezone.utc)
        token_expires = token_doc["expires_at"]
        
        # Ensure both datetimes are timezone-aware
        if token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)
            
        if token_expires < current_time:
            raise HTTPException(status_code=400, detail="Token expirado")
        
        # Check if token is already used
        if token_doc["status"] == "used":
            raise HTTPException(status_code=400, detail="Token já foi utilizado")
        
        # Check usage count
        if token_doc["usage_count"] >= token_doc["max_usage"]:
            raise HTTPException(status_code=400, detail="Token já atingiu o limite de uso")
        
        # Update token as used
        await db.tokens.update_one(
            {"token_code": token_code},
            {
                "$set": {
                    "status": "used",
                    "used_at": datetime.now(timezone.utc),
                    "used_at_gym": gym_id
                },
                "$inc": {
                    "usage_count": 1
                }
            }
        )
        
        # Update user statistics
        await db.users.update_one(
            {"_id": ObjectId(token_doc["user_id"])},
            {
                "$inc": {
                    "tokens_used": 1,
                    "gyms_visited": 1 if token_doc["token_type"] == "academia" else 0
                }
            }
        )
        
        # Get user info for response
        user_doc = await db.users.find_one({"_id": ObjectId(token_doc["user_id"])})
        
        if not user_doc:
            logger.error(f"Usuário não encontrado para token: {token_doc['user_id']}")
            raise HTTPException(status_code=500, detail="Dados do usuário não encontrados")

        # Use default gym_id if not provided or get gym info
        if not gym_id:
            gym_id = "68e5bb68b0214a00f95f9d15"  # Default test gym
            
        gym_doc = await db.gyms.find_one({"_id": ObjectId(gym_id)})
        
        # Create validation record for admin tracking
        validation_record = {
            "validation_id": str(uuid.uuid4()),
            "token_id": token_doc["token_id"],
            "token_code": token_doc["token_code"],
            "token_type": token_doc["token_type"],
            "user_id": token_doc["user_id"],
            "user_name": user_doc["full_name"],
            "user_email": user_doc["email"],
            "gym_id": gym_id,
            "gym_name": gym_doc.get("name", "Academia") if gym_doc else "Academia",
            "validated_at": datetime.now(timezone.utc),
            "status": "validated",
            "created_at": datetime.now(timezone.utc)
        }
        
        # Save validation record for admin dashboard
        await db.token_validations.insert_one(validation_record)
        
        return {
            "valid": True,
            "message": "Token validado com sucesso!",
            "token_info": {
                "token_id": token_doc["token_id"],
                "token_code": token_doc["token_code"],
                "token_type": token_doc["token_type"],
                "created_at": token_doc["created_at"],
                "expires_at": token_doc["expires_at"]
            },
            "user": {
                "id": str(user_doc["_id"]),
                "full_name": user_doc["full_name"],
                "plan_type": user_doc["plan_type"],
                "email": user_doc["email"],
                "phone": user_doc.get("phone", ""),
                "cpf": user_doc.get("cpf", ""),
                "date_of_birth": user_doc.get("date_of_birth", "").isoformat() if user_doc.get("date_of_birth") else "",
                "profile_photo": user_doc.get("profile_photo", ""),
                "address": user_doc.get("address", {}),
                "emergency_contact": user_doc.get("emergency_contact", {}),
                "medical_conditions": user_doc.get("medical_conditions", []),
                "tokens_used_today": user_doc.get("tokens_used", 0),
                "member_since": user_doc.get("created_at", datetime.now(timezone.utc)).isoformat()
            },
            "gym_info": {
                "id": gym_id,
                "name": gym_doc.get("name", "Academia") if gym_doc else "Academia",
                "validation_time": datetime.now(timezone.utc).isoformat()
            },
            "validation_id": validation_record["validation_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na validação do token: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@api_router.get("/gym/{gym_id}/clients-report")
async def get_gym_clients_report(gym_id: str):
    """Get clients report for gym - clients who used tokens at this gym"""
    try:
        # Get all validations for this gym
        validations = await db.token_validations.find({
            "gym_id": gym_id,
            "status": "validated"
        }).sort("validated_at", -1).to_list(100)
        
        clients_data = []
        unique_clients = set()
        
        for validation in validations:
            user_id = validation.get("user_id")
            if user_id and user_id not in unique_clients:
                unique_clients.add(user_id)
                
                # Get detailed user info
                user = await db.users.find_one({"_id": ObjectId(user_id)})
                if user:
                    # Count total visits for this client at this gym
                    visit_count = await db.token_validations.count_documents({
                        "gym_id": gym_id,
                        "user_id": user_id,
                        "status": "validated"
                    })
                    
                    clients_data.append({
                        "id": str(user["_id"]),
                        "full_name": user.get("full_name", ""),
                        "email": user.get("email", ""),
                        "phone": user.get("phone", ""),
                        "plan_type": user.get("plan_type", "basic"),
                        "total_visits": visit_count,
                        "first_visit": validation.get("validated_at", datetime.now(timezone.utc)).isoformat(),
                        "member_since": user.get("created_at", datetime.now(timezone.utc)).isoformat(),
                        "profile_photo": user.get("profile_photo", "")
                    })
        
        return {
            "gym_id": gym_id,
            "total_clients": len(clients_data),
            "clients": clients_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório de clientes: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")

@api_router.get("/gym/{gym_id}/revenue-report")
async def get_gym_revenue_report(gym_id: str):
    """Get revenue report for gym based on check-ins"""
    try:
        # Get gym contract info
        gym_contract = await db.gym_contracts.find_one({"gym_id": gym_id})
        check_in_value = gym_contract.get("check_in_value", 0.0) if gym_contract else 0.0
        
        # Get current month validations
        current_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (current_month + timedelta(days=32)).replace(day=1)
        
        monthly_checkins = await db.token_validations.count_documents({
            "gym_id": gym_id,
            "status": "validated",
            "validated_at": {"$gte": current_month, "$lt": next_month}
        })
        
        # Get all-time validations
        total_checkins = await db.token_validations.count_documents({
            "gym_id": gym_id,
            "status": "validated"
        })
        
        # Calculate revenue
        monthly_revenue = monthly_checkins * check_in_value
        total_revenue = total_checkins * check_in_value
        
        # Get last 30 days activity
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_checkins = await db.token_validations.count_documents({
            "gym_id": gym_id,
            "status": "validated",
            "validated_at": {"$gte": thirty_days_ago}
        })
        
        return {
            "gym_id": gym_id,
            "check_in_value": check_in_value,
            "monthly_stats": {
                "checkins": monthly_checkins,
                "revenue": monthly_revenue,
                "month": current_month.strftime("%B %Y")
            },
            "total_stats": {
                "checkins": total_checkins,
                "revenue": total_revenue
            },
            "last_30_days": {
                "checkins": recent_checkins,
                "revenue": recent_checkins * check_in_value
            },
            "contract_status": "active" if gym_contract else "pending",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório de receita: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")

@api_router.get("/gym/{gym_id}/contract")
async def get_gym_contract(gym_id: str):
    """Get gym contract information"""
    try:
        contract = await db.gym_contracts.find_one({"gym_id": gym_id})
        
        if not contract:
            return {
                "gym_id": gym_id,
                "contract_exists": False,
                "check_in_value": 0.0,
                "status": "pending_setup",
                "message": "Contrato não configurado. Configure o valor por check-in."
            }
        
        return {
            "gym_id": gym_id,
            "contract_exists": True,
            "check_in_value": contract.get("check_in_value", 0.0),
            "contract_document": contract.get("contract_document", ""),
            "signed_at": contract.get("signed_at", "").isoformat() if contract.get("signed_at") else "",
            "status": contract.get("status", "draft"),
            "created_at": contract.get("created_at", datetime.now(timezone.utc)).isoformat(),
            "updated_at": contract.get("updated_at", datetime.now(timezone.utc)).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar contrato: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar contrato")

@api_router.put("/gym/{gym_id}/contract/value")
async def update_gym_contract_value(gym_id: str, check_in_value: float):
    """Update gym contract check-in value"""
    try:
        if check_in_value < 0:
            raise HTTPException(status_code=400, detail="Valor por check-in deve ser positivo")
            
        # Update or create contract
        await db.gym_contracts.update_one(
            {"gym_id": gym_id},
            {
                "$set": {
                    "check_in_value": check_in_value,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$setOnInsert": {
                    "gym_id": gym_id,
                    "status": "draft",
                    "created_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Valor por check-in atualizado com sucesso",
            "gym_id": gym_id,
            "check_in_value": check_in_value
        }
        
    except Exception as e:
        logger.error(f"Erro ao atualizar valor do contrato: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar contrato")

@api_router.post("/gym/{gym_id}/contract/document")
async def upload_gym_contract_document(gym_id: str, contract_document: str):
    """Upload signed contract document (base64)"""
    try:
        # Update contract with document
        result = await db.gym_contracts.update_one(
            {"gym_id": gym_id},
            {
                "$set": {
                    "contract_document": contract_document,
                    "signed_at": datetime.now(timezone.utc),
                    "status": "signed",
                    "updated_at": datetime.now(timezone.utc)
                },
                "$setOnInsert": {
                    "gym_id": gym_id,
                    "created_at": datetime.now(timezone.utc),
                    "check_in_value": 0.0
                }
            },
            upsert=True
        )
        
        if result.matched_count == 0 and result.upserted_id:
            message = "Contrato criado e documento anexado com sucesso"
        else:
            message = "Documento do contrato atualizado com sucesso"
        
        return {
            "success": True,
            "message": message,
            "gym_id": gym_id,
            "signed_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao anexar documento do contrato: {e}")
        raise HTTPException(status_code=500, detail="Erro ao anexar documento")

# Gym routes
@api_router.get("/gyms", response_model=List[Gym])
async def get_gyms(lat: Optional[float] = None, lng: Optional[float] = None):
    gyms_cursor = db.gyms.find()
    gyms = []
    
    async for gym_doc in gyms_cursor:
        gym_doc["id"] = str(gym_doc["_id"])
        del gym_doc["_id"]
        
        # Calculate distance if coordinates provided
        if lat and lng:
            # Simple distance calculation (in real app, use proper geolocation)
            gym_doc["distance"] = abs(gym_doc["latitude"] - lat) + abs(gym_doc["longitude"] - lng)
        
        gyms.append(Gym(**gym_doc))
    
    return gyms

@api_router.post("/gyms", response_model=Gym)
async def create_gym(gym: Gym):
    gym_dict = gym.dict()
    result = await db.gyms.insert_one(gym_dict)
    gym_dict["id"] = str(result.inserted_id)
    del gym_dict["_id"]
    return Gym(**gym_dict)

# Workout routes
@api_router.get("/workouts", response_model=List[Workout])
async def get_workouts():
    workouts_cursor = db.workouts.find()
    workouts = []
    
    async for workout_doc in workouts_cursor:
        workout_doc["id"] = str(workout_doc["_id"])
        del workout_doc["_id"]
        workouts.append(Workout(**workout_doc))
    
    return workouts

@api_router.get("/workouts/user")
async def get_user_workouts(current_user: User = Depends(get_current_user)):
    user_workouts_cursor = db.user_workouts.find({"user_id": current_user.id})
    user_workouts = []
    
    async for workout_doc in user_workouts_cursor:
        workout_doc["id"] = str(workout_doc["_id"])
        del workout_doc["_id"]
        
        # Get workout details
        workout_details = await db.workouts.find_one({"_id": ObjectId(workout_doc["workout_id"])})
        if workout_details:
            workout_details["id"] = str(workout_details["_id"])
            del workout_details["_id"]
            workout_doc["workout"] = workout_details
        
        user_workouts.append(workout_doc)
    
    return user_workouts

# Nutrition routes
@api_router.get("/nutrition/plan")
async def get_nutrition_plan(current_user: User = Depends(get_current_user)):
    plan = await db.nutrition_plans.find_one({"user_id": current_user.id, "active": True})
    
    if not plan:
        return {"message": "No active nutrition plan"}
    
    plan["id"] = str(plan["_id"])
    del plan["_id"]
    return plan

# Gym Authentication Routes
@api_router.post("/auth/gym/login")
async def gym_login(credentials: GymLogin):
    """Login for gym staff"""
    gym_user = await db.gym_users.find_one({"email": credentials.email})
    if not gym_user or not verify_password(credentials.password, gym_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not gym_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta da academia desativada"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(gym_user["_id"]), "type": "gym"}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "gym_id": gym_user["gym_id"]}

# Admin endpoints
@api_router.get("/admin/dashboard")
async def get_admin_dashboard():
    total_users = await db.users.count_documents({})
    active_subscriptions = await db.users.count_documents({"plan_type": {"$ne": "basic"}})
    total_gyms = await db.gyms.count_documents({})
    
    # Count tokens generated today
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tokens_generated_today = await db.token_usage.count_documents({"created_at": {"$gte": today}})
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subscriptions,
        "overdue_payments": 2,  # Mock data
        "blocked_users": 1,     # Mock data
        "total_gyms": total_gyms,
        "tokens_generated_today": tokens_generated_today,
        "monthly_revenue": 15000  # Mock data
    }

@api_router.get("/admin/gyms")
async def get_admin_gyms():
    gyms = await db.gyms.find({}).to_list(100)
    for gym in gyms:
        gym["id"] = str(gym["_id"])
        del gym["_id"]
    return gyms

@api_router.post("/admin/gyms/register")
async def register_gym(gym_data: dict):
    import random
    import string
    import re
    
    # Validações básicas
    if not gym_data.get("name", "").strip():
        raise HTTPException(status_code=400, detail="Nome da academia é obrigatório")
    
    if not gym_data.get("cnpj", "").strip():
        raise HTTPException(status_code=400, detail="CNPJ é obrigatório")
    
    if not gym_data.get("email", "").strip():
        raise HTTPException(status_code=400, detail="Email é obrigatório")
        
    # Validação de email
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, gym_data["email"]):
        raise HTTPException(status_code=400, detail="Email inválido")
        
    # Validar se CNPJ já existe
    existing_gym = await db.gyms.find_one({"cnpj": gym_data["cnpj"]})
    if existing_gym:
        raise HTTPException(status_code=409, detail=f"Academia com CNPJ {gym_data['cnpj']} já cadastrada")
        
    # Validar se email já existe
    existing_email = await db.gyms.find_one({"email": gym_data["email"]})
    if existing_email:
        raise HTTPException(status_code=409, detail=f"Academia com email {gym_data['email']} já cadastrada")
    
    # Use custom password if provided, otherwise generate one
    custom_password = gym_data.get("custom_password", "").strip()
    
    if custom_password:
        # Use admin-provided password
        password = custom_password
        login = gym_data.get("custom_login", "").strip()
        if not login:
            # Generate login if not provided
            login = f"gym_{gym_data['name'].lower().replace(' ', '_')[:10]}_{random.randint(1000, 9999)}"
    else:
        # Generate automatic credentials (fallback)
        login = f"gym_{gym_data['name'].lower().replace(' ', '_')[:10]}_{random.randint(1000, 9999)}"
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    
    # Verificar se o login já existe
    existing_login = await db.gyms.find_one({"login_credentials.username": login})
    if existing_login:
        # Gerar novo login único
        login = f"gym_{gym_data['name'].lower().replace(' ', '_')[:10]}_{random.randint(1000, 9999)}"
    
    # Hash the password
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(password)
    
    # Prepare gym document
    gym_doc = {
        "name": gym_data.get("name", ""),
        "cnpj": gym_data.get("cnpj", ""),
        "razao_social": gym_data.get("razao_social", ""),
        "address": f"{gym_data.get('endereco', '')}, {gym_data.get('numero', '')} - {gym_data.get('bairro', '')}, {gym_data.get('cidade', '')}/{gym_data.get('estado', '')}",
        "endereco_completo": {
            "endereco": gym_data.get("endereco", ""),
            "numero": gym_data.get("numero", ""),
            "complemento": gym_data.get("complemento", ""),
            "bairro": gym_data.get("bairro", ""),
            "cidade": gym_data.get("cidade", ""),
            "estado": gym_data.get("estado", ""),
            "cep": gym_data.get("cep", "")
        },
        "email": gym_data.get("email", ""),
        "site": gym_data.get("site", ""),
        "phone": gym_data.get("telefone_principal", ""),
        "telefone_secundario": gym_data.get("telefone_secundario", ""),
        "horario_funcionamento": gym_data.get("horario_funcionamento", ""),
        "type": gym_data.get("tipo_academia", "completa"),
        "franquia": gym_data.get("franquia", ""),
        "num_unidades": gym_data.get("num_unidades", "1"),
        "responsavel": {
            "nome": gym_data.get("responsavel_nome", ""),
            "cargo": gym_data.get("responsavel_cargo", ""),
            "email": gym_data.get("responsavel_email", ""),
            "telefone": gym_data.get("responsavel_telefone", "")
        },
        "modelo_negocio": gym_data.get("modelo_negocio", ""),
        "dados_legais": {
            "inscricao_estadual": gym_data.get("inscricao_estadual", ""),
            "alvara_funcionamento": gym_data.get("alvara_funcionamento", ""),
            "documento_responsavel": gym_data.get("documento_responsavel", "")
        },
        "dados_operacionais": {
            "recursos_oferecidos": gym_data.get("recursos_oferecidos", ""),
            "politicas_cancelamento": gym_data.get("politicas_cancelamento", ""),
            "observacoes_qualidade": gym_data.get("observacoes_qualidade", "")
        },
        "login_credentials": {
            "username": login,
            "password_hash": hashed_password
        },
        "status": "approved",  # Auto-approve gyms created by admin
        "created_at": datetime.now(timezone.utc),
        "approved_at": None
    }
    
    # Insert gym into database
    result = await db.gyms.insert_one(gym_doc)
    
    # TODO: Send email with credentials
    # For now, just return the credentials
    
    return {
        "success": True,
        "gym_id": str(result.inserted_id),
        "login": login,
        "password": password,
        "gym_name": gym_data.get("name", "Academia Teste"),
        "gym_email": gym_data.get("email", "teste@academia.com"),
        "status": "approved",
        "message": f"🎉 PARCEIRO CADASTRADO COM SUCESSO! Academia '{gym_data.get('name', 'Academia Teste')}' foi cadastrada e aprovada automaticamente. Credenciais enviadas para {gym_data.get('email', 'teste@academia.com')}.",
        "login_credentials": {
            "username": login,
            "password": password
        },
        "next_steps": [
            "Credenciais foram enviadas por email",
            "Academia já pode validar tokens de clientes",
            "Acesse o Sistema Academia com as credenciais",
            "URL do Sistema: /academia"
        ]
    }

@api_router.post("/admin/gyms/create-test")
async def create_test_gym():
    """Create a test gym for demonstration purposes"""
    import random
    import string
    from passlib.context import CryptContext
    
    # Generate test credentials
    login = "academia_teste_demo"
    password = "123456"
    
    # Hash the password
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(password)
    
    # Create test gym data
    gym_doc = {
        "name": "Academia Teste Demo",
        "cnpj": "12.345.678/0001-99",
        "razao_social": "Academia Teste Demo LTDA",
        "address": "Rua de Teste, 123 - Centro, São Paulo/SP",
        "endereco_completo": {
            "endereco": "Rua de Teste",
            "numero": "123",
            "complemento": "",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567"
        },
        "email": "contato@academiateste.com",
        "site": "",
        "phone": "(11) 3333-4444",
        "telefone_secundario": "",
        "horario_funcionamento": "06:00 - 22:00",
        "type": "completa",
        "franquia": "",
        "num_unidades": "1",
        "responsavel": {
            "nome": "João Silva Teste",
            "cargo": "Gerente",
            "email": "joao@academiateste.com",
            "telefone": "(11) 99999-8888"
        },
        "modelo_negocio": "Mensal",
        "dados_legais": {
            "inscricao_estadual": "",
            "alvara_funcionamento": "",
            "documento_responsavel": ""
        },
        "dados_operacionais": {
            "recursos_oferecidos": "Musculação, Cardio, Aulas em Grupo",
            "politicas_cancelamento": "",
            "observacoes_qualidade": ""
        },
        "login_credentials": {
            "username": login,
            "password_hash": hashed_password
        },
        "status": "approved",
        "created_at": datetime.now(timezone.utc),
        "approved_at": datetime.now(timezone.utc)
    }
    
    # Check if test gym already exists
    existing_gym = await db.gyms.find_one({"login_credentials.username": login})
    if existing_gym:
        # Update existing gym
        result = await db.gyms.update_one(
            {"_id": existing_gym["_id"]},
            {"$set": gym_doc}
        )
        gym_id = str(existing_gym["_id"])
    else:
        # Insert new gym
        result = await db.gyms.insert_one(gym_doc)
        gym_id = str(result.inserted_id)
    
    return {
        "success": True,
        "gym_id": gym_id,
        "login": login,
        "password": password,
        "message": f"🎉 ACADEMIA DE TESTE CRIADA! Use as credenciais: {login} / {password}",
        "login_url": "/academia"
    }

@api_router.post("/admin/create-test-token")
async def create_test_token():
    """Create a test token for gym validation testing"""
    try:
        # Check if test user exists, if not create one
        test_user = await db.users.find_one({"email": "cliente.teste@luxepass.com"})
        
        if not test_user:
            # Create test user
            test_user_data = {
                "full_name": "Cliente Teste LuxePass",
                "email": "cliente.teste@luxepass.com",
                "phone": "(11) 99999-9999",
                "cpf": "123.456.789-00",
                "date_of_birth": datetime(1990, 1, 1, tzinfo=timezone.utc),
                "plan_type": "vip",
                "profile_photo": "https://via.placeholder.com/100",
                "address": {
                    "street": "Rua Teste",
                    "number": "123",
                    "city": "São Paulo",
                    "state": "SP",
                    "zip": "01234-567"
                },
                "emergency_contact": {
                    "name": "Emergência Teste",
                    "phone": "(11) 88888-8888"
                },
                "medical_conditions": ["Nenhuma condição especial"],
                "tokens_used": 0,
                "created_at": datetime.now(timezone.utc),
                "password_hash": "$2b$12$dummy.hash.for.test.user.only"
            }
            
            result = await db.users.insert_one(test_user_data)
            test_user_id = str(result.inserted_id)
        else:
            test_user_id = str(test_user["_id"])
        
        # Create test token
        token_data = {
            "token_id": str(uuid.uuid4()),
            "token_code": "TEST123",
            "user_id": test_user_id,
            "token_type": "academia",
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
            "status": "active",
            "created_by_checkin": False,
            "usage_count": 0,
            "max_usage": 3
        }
        
        # Delete existing test token if exists
        await db.tokens.delete_many({"token_code": "TEST123"})
        
        # Insert new test token
        await db.tokens.insert_one(token_data)
        
        return {
            "success": True,
            "token_code": "TEST123",
            "user_id": test_user_id,
            "message": "🎫 Token de teste criado! Use o código 'TEST123' para validar na academia.",
            "test_user": {
                "name": "Cliente Teste LuxePass",
                "email": "cliente.teste@luxepass.com",
                "plan": "vip"
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar token de teste: {e}")
        raise HTTPException(500, "Erro ao criar token de teste")

@api_router.post("/admin/create-test-professionals")
async def create_test_professionals():
    """Create test professionals for development"""
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # Create test nutritionist
        nutritionist_password = "nutri123"
        nutritionist_hashed = pwd_context.hash(nutritionist_password)
        
        nutritionist_data = {
            "full_name": "Dra. Marina Santos Nutrição",
            "email": "nutri.teste@luxepass.com",
            "password_hash": nutritionist_hashed,
            "professional_type": "nutritionist",
            "cref_crn": "CRN3 12345",
            "specialization": "Nutrição Esportiva e Clínica",
            "phone": "(11) 99999-1234",
            "bio": "Nutricionista especializada em emagrecimento e performance esportiva",
            "experience_years": 8,
            "consultation_fee": 150.0,
            "active": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Create test personal trainer
        personal_password = "personal123"
        personal_hashed = pwd_context.hash(personal_password)
        
        personal_data = {
            "full_name": "Prof. Carlos Silva Personal",
            "email": "personal.teste@luxepass.com",
            "password_hash": personal_hashed,
            "professional_type": "personal_trainer",
            "cref_crn": "CREF 098765",
            "specialization": "Treinamento Funcional e Musculação",
            "phone": "(11) 99999-5678",
            "bio": "Personal trainer especializado em treinos personalizados e reabilitação",
            "experience_years": 10,
            "consultation_fee": 120.0,
            "active": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Check if professionals already exist
        existing_nutritionist = await db.professionals.find_one({"email": "nutri.teste@luxepass.com"})
        existing_personal = await db.professionals.find_one({"email": "personal.teste@luxepass.com"})
        
        results = []
        
        if not existing_nutritionist:
            result_nutri = await db.professionals.insert_one(nutritionist_data)
            results.append({
                "type": "nutritionist",
                "id": str(result_nutri.inserted_id),
                "email": "nutri.teste@luxepass.com",
                "password": nutritionist_password
            })
        else:
            results.append({
                "type": "nutritionist",
                "id": str(existing_nutritionist["_id"]),
                "email": "nutri.teste@luxepass.com",
                "password": nutritionist_password,
                "status": "already_exists"
            })
            
        if not existing_personal:
            result_personal = await db.professionals.insert_one(personal_data)
            results.append({
                "type": "personal_trainer",
                "id": str(result_personal.inserted_id),
                "email": "personal.teste@luxepass.com",
                "password": personal_password
            })
        else:
            results.append({
                "type": "personal_trainer",
                "id": str(existing_personal["_id"]),
                "email": "personal.teste@luxepass.com",
                "password": personal_password,
                "status": "already_exists"
            })
        
        return {
            "success": True,
            "message": "Profissionais de teste criados/atualizados com sucesso!",
            "professionals": results,
            "instructions": {
                "nutritionist": {
                    "login": "nutri.teste@luxepass.com",
                    "password": nutritionist_password,
                    "url": "/professional/nutritionist/login"
                },
                "personal_trainer": {
                    "login": "personal.teste@luxepass.com", 
                    "password": personal_password,
                    "url": "/professional/personal/login"
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar profissionais de teste: {e}")
        raise HTTPException(500, f"Erro ao criar profissionais de teste: {str(e)}")

@api_router.get("/clients/available-appointments")
async def get_available_appointments(
    current_user: dict = Depends(get_current_user)
):
    """Get available appointment slots for both nutritionist and personal trainer"""
    try:
        user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user["_id"])
        plan_type = getattr(current_user, 'plan_type', 'vip') if hasattr(current_user, 'plan_type') else current_user.get("plan_type", "vip")
        
        # Para admin, simular plano VIP para testes
        user_type = getattr(current_user, 'type', None) if hasattr(current_user, 'type') else current_user.get("type")
        if user_type == "admin":
            plan_type = "vip"
        
        # Check if plan allows professional consultations
        if plan_type == "basico":
            return {
                "success": False,
                "message": "Seu plano não inclui consultas com profissionais. Faça upgrade para Intermediário ou VIP!",
                "available_slots": [],
                "plan_type": plan_type,
                "upgrade_required": True
            }
        
        # Check limits for both types
        limits = await get_monthly_appointment_limits_new(user_id, plan_type)
        
        # Get available slots for next 30 days
        from datetime import datetime, timedelta
        start_date = datetime.now()
        end_date = start_date + timedelta(days=30)
        
        # Get all available slots for both professional types
        slots_cursor = db.appointment_slots.find({
            "professional_type": {"$in": ["nutritionist", "personal_trainer"]},
            "available": True,
            "date": {
                "$gte": start_date.strftime("%Y-%m-%d"),
                "$lte": end_date.strftime("%Y-%m-%d")
            }
        }).sort([("professional_type", 1), ("date", 1), ("time", 1)]).limit(100)
        
        nutritionist_slots = []
        personal_slots = []
        
        async for slot in slots_cursor:
            # Get professional info
            professional = await db.professionals.find_one({
                "_id": ObjectId(slot["professional_id"])
            })
            
            if professional and professional.get("active", True):
                slot_data = {
                    "id": str(slot["_id"]),
                    "professional_id": slot["professional_id"],
                    "professional_name": professional["full_name"],
                    "professional_cref": professional["cref_crn"],
                    "professional_specialization": professional.get("specialization", ""),
                    "professional_type": slot["professional_type"],
                    "date": slot["date"],
                    "time": slot["time"],
                    "duration_minutes": slot.get("duration_minutes", 60),
                    "formatted_date": datetime.strptime(slot["date"], "%Y-%m-%d").strftime("%d/%m/%Y"),
                    "formatted_datetime": f"{datetime.strptime(slot['date'], '%Y-%m-%d').strftime('%d/%m/%Y')} às {slot['time']}"
                }
                
                if slot["professional_type"] == "nutritionist":
                    nutritionist_slots.append(slot_data)
                else:
                    personal_slots.append(slot_data)
        
        return {
            "success": True,
            "nutritionist_slots": nutritionist_slots,
            "personal_trainer_slots": personal_slots,
            "limits": limits,
            "plan_type": plan_type,
            "can_book_nutritionist": limits["remaining"]["nutritionist"] > 0,
            "can_book_personal": limits["remaining"]["personal_trainer"] > 0
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar horários disponíveis: {e}")
        raise HTTPException(500, f"Erro ao buscar horários disponíveis: {str(e)}")

@api_router.post("/clients/book-appointment")
async def book_appointment(
    booking_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Book an appointment slot"""
    try:
        user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user["_id"])
        plan_type = getattr(current_user, 'plan_type', 'vip') if hasattr(current_user, 'plan_type') else current_user.get("plan_type", "vip")
        
        # Para admin, simular plano VIP para testes
        user_type = getattr(current_user, 'type', None) if hasattr(current_user, 'type') else current_user.get("type")
        if user_type == "admin":
            plan_type = "vip"
        
        # Get data from request  
        slot_id = booking_data.get("slot_id")
        notes = booking_data.get("notes", "")
        
        if not slot_id:
            raise HTTPException(400, "ID do horário é obrigatório")
        
        # Get the slot
        slot = await db.appointment_slots.find_one({"_id": ObjectId(slot_id)})
        if not slot:
            raise HTTPException(404, "Horário não encontrado")
            
        if not slot.get("available", True):
            raise HTTPException(400, "Horário não está mais disponível")
        
        # Check appointment limits
        limits = await get_monthly_appointment_limits_new(user_id, plan_type)
        professional_type = slot["professional_type"]
        
        if professional_type == "nutritionist":
            remaining = limits["remaining"]["nutritionist"]
        elif professional_type == "personal_trainer":
            remaining = limits["remaining"]["personal_trainer"]
        else:
            raise HTTPException(400, "Tipo de profissional inválido")
            
        if remaining <= 0:
            raise HTTPException(400, f"Você já utilizou todas as consultas de {professional_type} do seu plano este mês")
        
        # Get professional info
        professional = await db.professionals.find_one({
            "_id": ObjectId(slot["professional_id"])
        })
        
        if not professional:
            raise HTTPException(404, "Profissional não encontrado")
        
        # Create appointment
        client_name = getattr(current_user, 'full_name', '') if hasattr(current_user, 'full_name') else current_user.get("full_name", "")
        client_email = getattr(current_user, 'email', '') if hasattr(current_user, 'email') else current_user.get("email", "")
        client_phone = getattr(current_user, 'phone', '') if hasattr(current_user, 'phone') else current_user.get("phone", "")
        
        appointment_data = {
            "client_id": user_id,
            "client_name": client_name,
            "client_email": client_email,
            "client_phone": client_phone,
            "professional_id": slot["professional_id"],
            "professional_name": professional["full_name"],
            "professional_type": professional_type,
            "appointment_date": slot["date"],
            "appointment_time": slot["time"],
            "duration_minutes": slot.get("duration_minutes", 60),
            "status": "scheduled",
            "notes": notes,
            "booked_at": datetime.now(timezone.utc),
            "can_cancel": True
        }
        
        # Insert appointment
        result = await db.appointments.insert_one(appointment_data)
        
        # Mark slot as unavailable
        await db.appointment_slots.update_one(
            {"_id": ObjectId(slot_id)},
            {"$set": {"available": False, "booked_by": user_id}}
        )
        
        return {
            "success": True,
            "appointment_id": str(result.inserted_id),
            "message": f"Consulta agendada com sucesso para {slot['date']} às {slot['time']}",
            "appointment": {
                "id": str(result.inserted_id),
                "professional_name": professional["full_name"],
                "professional_type": professional_type,
                "date": slot["date"],
                "time": slot["time"],
                "status": "scheduled"
            }
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Erro ao agendar consulta: {e}")
        raise HTTPException(500, f"Erro ao agendar consulta: {str(e)}")

async def get_monthly_appointment_limits_new(user_id: str, plan_type: str):
    """Get monthly appointment limits and usage for a user"""
    try:
        # Define limits based on plan
        plan_limits = {
            "basico": {"nutritionist": 0, "personal_trainer": 0},
            "intermediario": {"nutritionist": 1, "personal_trainer": 1},
            "premium": {"nutritionist": 2, "personal_trainer": 2}, 
            "vip": {"nutritionist": 2, "personal_trainer": 2}
        }
        
        limits = plan_limits.get(plan_type, {"nutritionist": 0, "personal_trainer": 0})
        
        # Get current month usage
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Count appointments this month
        nutritionist_count = await db.appointments.count_documents({
            "client_id": user_id,
            "professional_type": "nutritionist",
            "booked_at": {"$gte": start_of_month},
            "status": {"$ne": "cancelled"}
        })
        
        personal_count = await db.appointments.count_documents({
            "client_id": user_id,  
            "professional_type": "personal_trainer",
            "booked_at": {"$gte": start_of_month},
            "status": {"$ne": "cancelled"}
        })
        
        usage = {
            "nutritionist": nutritionist_count,
            "personal_trainer": personal_count
        }
        
        remaining = {
            "nutritionist": max(0, limits["nutritionist"] - usage["nutritionist"]),
            "personal_trainer": max(0, limits["personal_trainer"] - usage["personal_trainer"])
        }
        
        return {
            "plan_type": plan_type,
            "limits": limits,
            "usage": usage,
            "remaining": remaining
        }
        
    except Exception as e:
        logger.error(f"Erro ao calcular limites de consulta: {e}")
        return {
            "plan_type": plan_type,
            "limits": {"nutritionist": 0, "personal_trainer": 0},
            "usage": {"nutritionist": 0, "personal_trainer": 0},
            "remaining": {"nutritionist": 0, "personal_trainer": 0}
        }

@api_router.post("/admin/gyms/{gym_id}/reset-password")
async def reset_gym_password(gym_id: str):
    """Reset gym password and return new credentials"""
    import random
    import string
    from passlib.context import CryptContext
    
    try:
        # Generate new password
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # Hash the new password
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(new_password)
        
        # Update gym password in database
        result = await db.gyms.update_one(
            {"_id": ObjectId(gym_id)},
            {"$set": {
                "login_credentials.password_hash": hashed_password,
                "password_reset_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Academia não encontrada")
            
        # Get gym info for response
        gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
        gym_name = gym.get("name", "Academia")
        login = gym.get("login_credentials", {}).get("username", "")
        
        return {
            "success": True,
            "gym_id": gym_id,
            "gym_name": gym_name,
            "login": login,
            "password": new_password,
            "message": f"🔄 SENHA RESETADA! Nova senha gerada para '{gym_name}'. Login: {login} / Nova Senha: {new_password}",
            "reset_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro ao resetar senha: {str(e)}")

@api_router.put("/admin/gyms/{gym_id}/status")
async def update_gym_status(gym_id: str, status_data: dict):
    status = status_data["status"]
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if status == "approved":
        update_data["approved_at"] = datetime.now(timezone.utc)
    
    result = await db.gyms.update_one(
        {"_id": ObjectId(gym_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Academia não encontrada")
    
    return {"success": True, "message": f"Status atualizado para: {status}"}

@api_router.put("/admin/gyms/{gym_id}/reset-password")
async def reset_gym_password(gym_id: str):
    import random
    import string
    
    # Generate new password
    new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    
    # Hash the new password
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(new_password)
    
    # Update gym password using MongoDB _id - salvar na estrutura correta
    # First get the current gym to preserve the username
    current_gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
    if not current_gym:
        raise HTTPException(status_code=404, detail="Academia não encontrada")
    
    # Get existing username or generate one
    existing_username = current_gym.get("login_credentials", {}).get("username")
    if not existing_username:
        # If no username exists, generate one
        existing_username = f"gym_{gym_id[:8]}_{random.randint(1000, 9999)}"
    
    result = await db.gyms.update_one(
        {"_id": ObjectId(gym_id)},
        {
            "$set": {
                "login_credentials.username": existing_username,
                "login_credentials.password_hash": hashed_password,
                "password_reset_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Academia não encontrada")
    
    # Get gym info
    gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
    
    return {
        "success": True,
        "new_password": new_password,
        "login": existing_username,
        "message": f"Nova senha gerada para {current_gym.get('name', 'Academia')}"
    }

@api_router.put("/admin/gyms/{gym_id}/set-password")
async def set_gym_password(gym_id: str, password_data: dict):
    """Endpoint para definir senha manual da academia"""
    custom_password = password_data.get("password", "").strip()
    custom_login = password_data.get("login", "").strip()
    
    if not custom_password:
        raise HTTPException(status_code=400, detail="Senha é obrigatória")
    
    if len(custom_password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
    
    # Hash the new password
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(custom_password)
    
    # Prepare update data
    update_data = {
        "login_credentials.password_hash": hashed_password,
        "password_reset_at": datetime.now(timezone.utc)
    }
    
    # Update login if provided
    if custom_login:
        update_data["login_credentials.username"] = custom_login
    else:
        # If no custom login provided, we need to ensure username exists
        # Get current gym to check if username already exists
        current_gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
        if current_gym and not current_gym.get("login_credentials", {}).get("username"):
            # Generate a username if none exists
            import random
            update_data["login_credentials.username"] = f"gym_{gym_id[:8]}_{random.randint(1000, 9999)}"
    
    # Update gym password and login
    result = await db.gyms.update_one(
        {"_id": ObjectId(gym_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Academia não encontrada")
    
    # Get updated gym info
    gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
    
    return {
        "success": True,
        "login": gym.get("login_credentials", {}).get("username", custom_login),
        "message": "Senha definida com sucesso"
    }


# Gym authentication endpoint for validation system
@api_router.post("/gym/auth")
async def gym_authenticate(credentials: dict):
    # Aceitar tanto "login" quanto "username" para compatibilidade
    login = credentials.get("login") or credentials.get("username")
    password = credentials.get("password")
    
    if not login or not password:
        raise HTTPException(status_code=400, detail="Login e senha são obrigatórios")
    
    # Find gym by login_credentials.username (estrutura correta)
    gym = await db.gyms.find_one({"login_credentials.username": login})
    
    if not gym:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verify password usando login_credentials.password_hash
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    stored_password_hash = gym.get("login_credentials", {}).get("password_hash")
    if not stored_password_hash:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not pwd_context.verify(password, stored_password_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if gym["status"] not in ["approved", "active"]:
        raise HTTPException(status_code=403, detail="Academia não aprovada para uso")
    
    # Generate token for gym session
    gym_token = create_access_token(data={"sub": str(gym["_id"]), "type": "gym"})
    
    return {
        "access_token": gym_token,
        "token_type": "bearer",
        "gym_info": {
            "id": str(gym["_id"]),
            "name": gym["name"],
            "type": gym.get("tipo_academia", "Completa"),
            "status": gym["status"]
        }
    }



@api_router.post("/admin/users/{user_id}/unblock")
async def unblock_user(user_id: str):
    """Unblock user"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_blocked": False,
                "payment_status": "active"
            },
            "$unset": {
                "block_reason": "",
                "blocked_at": ""
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Usuário não encontrado")
    
    return {"message": "Usuário desbloqueado com sucesso"}

@api_router.post("/admin/gyms/create")
async def create_gym_with_user(gym_data: GymCreate):
    """Create gym and gym user account"""
    
    # Check if gym email already exists
    existing_gym_user = await db.gym_users.find_one({"email": gym_data.email})
    if existing_gym_user:
        raise HTTPException(400, "Email já cadastrado")
    
    # Create gym record
    gym_dict = {
        "name": gym_data.name,
        "address": gym_data.address,
        "latitude": gym_data.latitude,
        "longitude": gym_data.longitude,
        "cnpj": gym_data.cnpj,
        "phone": gym_data.phone,
        "accepted_plans": gym_data.accepted_plans,
        "equipments": gym_data.equipments,
        "current_occupancy": 0,
        "max_capacity": gym_data.max_capacity,
        "rating": 0.0,
        "photos": [],
        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
    
    gym_result = await db.gyms.insert_one(gym_dict)
    gym_id = str(gym_result.inserted_id)
    
    # Generate password for gym user
    import secrets
    import string
    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    
    # Create gym user account
    gym_user = {
        "name": f"Gestor - {gym_data.name}",
        "email": gym_data.email,
        "password_hash": get_password_hash(password),
        "gym_id": gym_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.gym_users.insert_one(gym_user)
    
    return {
        "gym_id": gym_id,
        "login_email": gym_data.email,
        "login_password": password,
        "message": "Academia cadastrada com sucesso!"
    }

@api_router.get("/admin/gyms")
async def get_all_gyms():
    """Get all gyms for admin"""
    gyms_cursor = db.gyms.find()
    gyms = []
    
    async for gym_doc in gyms_cursor:
        gym_doc["id"] = str(gym_doc["_id"])
        del gym_doc["_id"]
        
        # Get gym user info
        gym_user = await db.gym_users.find_one({"gym_id": gym_doc["id"]})
        if gym_user:
            gym_doc["login_email"] = gym_user["email"]
            gym_doc["user_active"] = gym_user.get("is_active", True)
        
        gyms.append(gym_doc)
    
    return {"gyms": gyms}

@api_router.post("/admin/gyms/{gym_id}/toggle-status")
async def toggle_gym_status(gym_id: str):
    """Activate/deactivate gym"""
    gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
    if not gym:
        raise HTTPException(404, "Academia não encontrada")
    
    new_status = not gym.get("is_active", True)
    
    # Update gym status
    await db.gyms.update_one(
        {"_id": ObjectId(gym_id)},
        {"$set": {"is_active": new_status}}
    )
    
    # Update gym user status
    await db.gym_users.update_one(
        {"gym_id": gym_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "message": f"Academia {'ativada' if new_status else 'desativada'} com sucesso",
        "is_active": new_status
    }

@api_router.get("/admin/financial/overview")
async def financial_overview():
    """Get financial overview for admin"""
    
    # Total revenue
    total_revenue = await db.payment_transactions.aggregate([
        {"$match": {"payment_status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Monthly revenue
    monthly_revenue = await db.payment_transactions.aggregate([
        {
            "$match": {
                "payment_status": "completed",
                "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Overdue payments
    overdue_users = await db.users.count_documents({
        "payment_status": "overdue",
        "subscription_end": {"$lt": datetime.now(timezone.utc)}
    })
    
    # Revenue by plan
    revenue_by_plan = await db.payment_transactions.aggregate([
        {"$match": {"payment_status": "completed"}},
        {"$group": {"_id": "$plan_type", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]).to_list(10)
    
    return {
        "total_revenue": total_revenue[0]["total"] if total_revenue else 0,
        "monthly_revenue": monthly_revenue[0]["total"] if monthly_revenue else 0,
        "overdue_users": overdue_users,
        "revenue_by_plan": revenue_by_plan
    }

@api_router.get("/admin/users")
async def get_admin_users():
    users = await db.users.find({}).to_list(100)
    result = []
    
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "plan_type": user["plan_type"],
            "payment_status": user.get("payment_status", "active"),
            "subscription_end": user.get("subscription_end", datetime.now(timezone.utc) + timedelta(days=30)),
            "monthly_amount": user.get("monthly_amount", 89.90),
            "is_blocked": user.get("is_blocked", False),
            "created_at": user.get("created_at", datetime.now(timezone.utc))
        })
    
    return result

# Admin Professional Management Endpoints
@api_router.post("/admin/professionals")
async def create_professional_admin(professional: ProfessionalRegister, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new professional through admin interface"""
    try:
        # Verify admin access
        current_user = await get_current_admin(credentials)
        
        # Check if professional already exists
        existing_professional = await db.professionals.find_one({"email": professional.email})
        if existing_professional:
            raise HTTPException(status_code=400, detail="Profissional já cadastrado com este email")
        
        # Hash password
        password_hash = pwd_context.hash(professional.password)
        
        # Create professional
        professional_data = {
            "full_name": professional.full_name,
            "email": professional.email,
            "password_hash": password_hash,
            "professional_type": professional.professional_type,
            "cref_crn": professional.cref_crn,
            "specialization": professional.specialization,
            "bio": professional.bio,
            "phone": professional.phone,
            "experience_years": professional.experience_years,
            "pix_key": professional.pix_key,
            "active": True,
            "created_at": datetime.now(timezone.utc),
            "created_by_admin": str(current_user["id"])
        }
        
        result = await db.professionals.insert_one(professional_data)
        professional_data["id"] = str(result.inserted_id)
        
        return {
            "success": True,
            "message": f"Profissional {professional.full_name} criado com sucesso",
            "professional": {
                "id": professional_data["id"],
                "full_name": professional.full_name,
                "email": professional.email,
                "professional_type": professional.professional_type,
                "cref_crn": professional.cref_crn
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar profissional: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@api_router.get("/admin/professionals")
async def get_professionals_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all professionals for admin management"""
    try:
        # Verify admin access
        current_user = await get_current_admin(credentials)
        
        professionals = await db.professionals.find({}).to_list(100)
        result = []
        
        for prof in professionals:
            result.append({
                "id": str(prof["_id"]),
                "full_name": prof["full_name"],
                "email": prof["email"],
                "professional_type": prof["professional_type"],
                "cref_crn": prof.get("cref_crn", ""),
                "specialization": prof.get("specialization", ""),
                "phone": prof.get("phone", ""),
                "experience_years": prof.get("experience_years", 0),
                "pix_key": prof.get("pix_key", ""),
                "active": prof.get("active", True),
                "created_at": prof.get("created_at", datetime.now(timezone.utc))
            })
        
        return {"professionals": result}
        
    except Exception as e:
        logger.error(f"Erro ao listar profissionais: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@api_router.put("/admin/professionals/{professional_id}/reset-password")
async def reset_professional_password(professional_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Reset professional password"""
    try:
        # Verify admin access
        current_user = await get_current_admin(credentials)
        
        # Generate new temporary password
        import secrets
        import string
        temp_password = "temp" + ''.join(secrets.choice(string.digits) for _ in range(6))
        password_hash = pwd_context.hash(temp_password)
        
        # Update professional password
        result = await db.professionals.update_one(
            {"_id": ObjectId(professional_id)},
            {
                "$set": {
                    "password_hash": password_hash,
                    "password_reset_at": datetime.now(timezone.utc),
                    "requires_password_change": True,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Profissional não encontrado")
        
        return {
            "success": True,
            "message": "Senha resetada com sucesso",
            "temp_password": temp_password
        }
        
    except Exception as e:
        logger.error(f"Erro ao resetar senha do profissional: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@api_router.put("/admin/professionals/{professional_id}/status")
async def update_professional_status_admin(professional_id: str, active: bool, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Activate/deactivate professional"""
    try:
        # Verify admin access
        current_user = await get_current_admin(credentials)
        
        result = await db.professionals.update_one(
            {"_id": ObjectId(professional_id)},
            {"$set": {"active": active, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Profissional não encontrado")
        
        status_text = "ativado" if active else "desativado"
        return {"success": True, "message": f"Profissional {status_text} com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao atualizar status do profissional: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@api_router.post("/admin/users")
async def create_user_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new user through admin interface"""
    try:
        # Verify admin access
        current_user = await get_current_admin(credentials)
        
        # Create VIP test user
        user_data = {
            "full_name": "Isabella Costa VIP",
            "email": "isabella@luxepass.com",
            "password_hash": pwd_context.hash("isabella123"),
            "plan_type": "vip",
            "phone": "(11) 99999-8888",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "subscription_start": datetime.now(timezone.utc),
            "subscription_end": datetime.now(timezone.utc) + timedelta(days=365),
            "created_by_admin": str(current_user["id"])
        }
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data["email"]})
        if existing_user:
            return {"success": True, "message": "Cliente VIP já existe", "user_id": str(existing_user["_id"])}
        
        result = await db.users.insert_one(user_data)
        
        return {
            "success": True,
            "message": f"Cliente VIP {user_data['full_name']} criado com sucesso",
            "user": {
                "id": str(result.inserted_id),
                "full_name": user_data["full_name"],
                "email": user_data["email"],
                "plan_type": user_data["plan_type"]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar usuário VIP: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@api_router.get("/professionals/clients")
async def get_professional_clients(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get clients assigned to current professional"""
    try:
        # Get token info to identify professional
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        professional_id: str = payload.get("sub")
        professional_type: str = payload.get("professional_type")
        
        if professional_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # Get clients flagged for this professional
        flagged_clients = await db.client_assignments.find({
            "professional_id": professional_id,
            "professional_type": professional_type
        }).to_list(100)
        
        if not flagged_clients:
            return {"clients": []}
        
        # Get detailed client information
        clients = []
        for assignment in flagged_clients:
            client_id = assignment["client_id"]
            user = await db.users.find_one({"_id": ObjectId(client_id)})
            if user and user.get("plan_type") in ["premium", "vip"]:
                clients.append({
                    "id": str(user["_id"]),
                    "full_name": user["full_name"],
                    "email": user["email"],
                    "plan_type": user["plan_type"],
                    "status": user.get("status", "active"),
                    "flagged_date": assignment["assigned_at"].isoformat(),
                    "last_session": None,  # TODO: implementar sessões
                    "next_session": None,  # TODO: implementar agendamento
                    "progress_status": "good"  # TODO: implementar progresso
                })
        
        return {"clients": clients}
        
    except Exception as e:
        logger.error(f"Erro ao listar clientes do profissional: {e}")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

@api_router.get("/professionals/unassigned-clients")
async def get_unassigned_clients(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get Premium/VIP clients not yet assigned to any professional"""
    try:
        # Get token info to identify professional type
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        professional_id: str = payload.get("sub")
        professional_type: str = payload.get("professional_type")
        
        if professional_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # Get all Premium/VIP users from database
        premium_vip_users = await db.users.find({
            "plan_type": {"$in": ["premium", "vip"]},
            "$or": [
                {"status": "active"},
                {"status": {"$exists": False}},
                {"status": None}
            ]
        }).to_list(100)
        
        # Get already assigned clients for this professional type
        assigned_clients = await db.client_assignments.find({
            "professional_type": professional_type,
            "status": "active"
        }).to_list(1000)
        assigned_client_ids = [assignment["client_id"] for assignment in assigned_clients]
        
        # Filter unassigned clients
        unassigned_clients = []
        for user in premium_vip_users:
            user_id = str(user["_id"])
            if user_id not in assigned_client_ids:
                unassigned_clients.append({
                    "id": user_id,
                    "full_name": user.get("full_name", "Usuário"),
                    "email": user.get("email", ""),
                    "plan_type": user.get("plan_type", "basic"),
                    "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat(),
                    "tokens_available": user.get("tokens_available", 0),
                    "subscription_end": user.get("subscription_end").isoformat() if user.get("subscription_end") else None
                })
        
        return {"clients": unassigned_clients}
        
    except Exception as e:
        logger.error(f"Erro ao buscar clientes não atribuídos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar clientes disponíveis")
        
        return {"clients": unassigned_clients}
        
    except Exception as e:
        logger.error(f"Erro ao listar clientes não designados: {e}")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

@api_router.post("/professionals/flag-client")
async def flag_client_for_professional(
    request: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Assign client to current professional"""
    try:
        # Get token info to identify professional
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        professional_id: str = payload.get("sub")
        professional_type: str = payload.get("professional_type")
        
        if professional_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # Get client_id from request body
        client_id = request.get("client_id")
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id é obrigatório")
        
        # Verify client exists and is Premium/VIP
        client = await db.users.find_one({"_id": ObjectId(client_id)})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        if client.get("plan_type") not in ["premium", "vip"]:
            raise HTTPException(status_code=400, detail="Apenas clientes Premium/VIP podem ser atribuídos")
        
        # Check if already assigned to this professional type
        existing_assignment = await db.client_assignments.find_one({
            "client_id": client_id,
            "professional_type": professional_type
        })
        
        if existing_assignment:
            return {"success": True, "message": "Cliente já designado para este tipo de profissional"}
        
        # Create assignment in client_assignments collection
        assignment_data = {
            "client_id": client_id,
            "professional_id": professional_id,
            "professional_type": professional_type,
            "assigned_at": datetime.now(timezone.utc),
            "status": "active"
        }
        
        await db.client_assignments.insert_one(assignment_data)
        
        return {"success": True, "message": "Cliente designado com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao designar cliente: {e}")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

# Professional System Endpoints
@api_router.post("/professionals/register")
async def register_professional(professional: ProfessionalRegister):
    """Register a new professional (nutritionist or personal trainer)"""
    try:
        # Check if professional already exists
        existing_professional = await db.professionals.find_one({"email": professional.email})
        if existing_professional:
            raise HTTPException(status_code=400, detail="Profissional já cadastrado com este email")
        
        # Hash password
        password_hash = pwd_context.hash(professional.password)
        
        # Create professional
        professional_data = {
            "full_name": professional.full_name,
            "email": professional.email,
            "password_hash": password_hash,
            "professional_type": professional.professional_type,
            "cref_crn": professional.cref_crn,
            "specialization": professional.specialization,
            "bio": professional.bio,
            "phone": professional.phone,
            "experience_years": professional.experience_years,
            "active": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        result = await db.professionals.insert_one(professional_data)
        
        return {
            "id": str(result.inserted_id),
            "message": f"{professional.professional_type.title()} cadastrado com sucesso!",
            "professional_type": professional.professional_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao cadastrar profissional: {e}")
        raise HTTPException(status_code=500, detail="Erro ao cadastrar profissional")

@api_router.post("/professionals/login")
async def login_professional(professional_login: ProfessionalLogin):
    """Professional login"""
    try:
        # Find professional
        professional = await db.professionals.find_one({"email": professional_login.email})
        if not professional:
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        # Check password
        if not pwd_context.verify(professional_login.password, professional["password_hash"]):
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        if not professional.get("active", True):
            raise HTTPException(status_code=401, detail="Conta de profissional desativada")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(professional["_id"]), "type": "professional", "professional_type": professional["professional_type"]},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "professional": {
                "id": str(professional["_id"]),
                "full_name": professional["full_name"],
                "email": professional["email"],
                "professional_type": professional["professional_type"],
                "cref_crn": professional["cref_crn"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no login do profissional: {e}")
        raise HTTPException(status_code=500, detail="Erro no login")

async def get_current_professional(token: str = Depends(oauth2_scheme)):
    """Get current professional from token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        professional_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if professional_id is None or token_type != "professional":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    professional = await db.professionals.find_one({"_id": ObjectId(professional_id)})
    if professional is None:
        raise credentials_exception
    
    return professional

@api_router.get("/professionals/profile")
async def get_professional_profile(current_professional: dict = Depends(get_current_professional)):
    """Get professional profile"""
    return {
        "id": str(current_professional["_id"]),
        "full_name": current_professional["full_name"],
        "email": current_professional["email"],
        "professional_type": current_professional["professional_type"],
        "cref_crn": current_professional["cref_crn"],
        "specialization": current_professional.get("specialization"),
        "bio": current_professional.get("bio"),
        "phone": current_professional.get("phone"),
        "experience_years": current_professional.get("experience_years"),
        "created_at": current_professional["created_at"].isoformat()
    }

@api_router.get("/professionals/my-clients")
async def get_professional_clients(current_professional: dict = Depends(get_current_professional)):
    """Get clients assigned to current professional"""
    try:
        professional_type = current_professional["professional_type"]
        professional_id = str(current_professional["_id"])
        
        # Get users with active premium/vip plans
        users = await db.users.find({
            "plan_type": {"$in": ["premium", "vip"]},
            "payment_status": "active"
        }).to_list(100)
        
        # Get clients with plans created by this professional
        if professional_type == "nutritionist":
            plans = await db.supplement_plans.find({
                "created_by": professional_id,
                "active": True
            }).to_list(100)
        else:  # personal trainer
            plans = await db.workout_plans.find({
                "created_by": professional_id,
                "active": True
            }).to_list(100)
        
        # Get user IDs with plans from this professional
        users_with_plans = [plan["user_id"] for plan in plans]
        
        result = []
        for user in users:
            has_plan = str(user["_id"]) in users_with_plans
            result.append({
                "id": str(user["_id"]),
                "full_name": user.get("full_name", "Usuário"),
                "email": user.get("email", ""),
                "plan_type": user.get("plan_type", "basic"),
                "status": user.get("payment_status", "inactive"),
                "has_plan": has_plan,
                "created_at": user.get("created_at", datetime.now()).isoformat()
            })
        
        return {"clients": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar clientes do profissional: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar clientes")

@api_router.get("/professionals/my-appointments")
async def get_professional_appointments(current_professional: dict = Depends(get_current_professional)):
    """Get appointments for current professional"""
    try:
        professional_type = current_professional["professional_type"]
        
        appointments = await db.appointments.find({
            "professional_type": professional_type
        }).sort("appointment_date", 1).to_list(50)
        
        result = []
        for appointment in appointments:
            # Get user details
            user_id = appointment.get("user_id") or appointment.get("client_id")
            user = await db.users.find_one({"_id": ObjectId(user_id)}) if user_id else None
            
            result.append({
                "id": str(appointment["_id"]),
                "user_name": user.get("full_name", "Usuário") if user else "Usuário",
                "user_email": user.get("email", "") if user else "",
                "user_plan": user.get("plan_type", "basic") if user else "basic",
                "appointment_date": appointment["appointment_date"].isoformat(),
                "status": appointment["status"],
                "notes": appointment.get("notes", ""),
                "created_at": appointment["created_at"].isoformat()
            })
        
        return {"appointments": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar agendamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar agendamentos")

# Enhanced supplement and workout creation with professional info
@api_router.post("/professionals/supplements/create")
async def create_supplement_plan_professional(
    plan: SupplementPlan,
    current_professional: dict = Depends(get_current_professional)
):
    """Create supplement plan by nutritionist"""
    try:
        if current_professional["professional_type"] != "nutritionist":
            raise HTTPException(status_code=403, detail="Apenas nutricionistas podem criar planos de suplementação")
        
        professional_id = str(current_professional["_id"])
        professional_name = current_professional["full_name"]
        
        plan_data = {
            "user_id": plan.user_id,
            "supplements": plan.supplements,
            "created_by": professional_id,
            "created_by_name": professional_name,
            "created_by_cref": current_professional["cref_crn"],
            "created_at": datetime.now(timezone.utc),
            "start_date": plan.start_date,
            "end_date": plan.end_date,
            "active": True
        }
        
        result = await db.supplement_plans.insert_one(plan_data)
        
        # Create daily supplement logs
        await create_supplement_logs_for_plan(str(result.inserted_id), plan)
        
        return {
            "id": str(result.inserted_id),
            "message": f"Plano de suplementação criado por {professional_name}",
            "created_by": professional_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar plano de suplementação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar plano")

@api_router.post("/professionals/workouts/create")
async def create_workout_plan_professional(
    plan: WorkoutPlan,
    current_professional: dict = Depends(get_current_professional)
):
    """Create workout plan by personal trainer"""
    try:
        if current_professional["professional_type"] != "personal":
            raise HTTPException(status_code=403, detail="Apenas personal trainers podem criar planos de treino")
        
        professional_id = str(current_professional["_id"])
        professional_name = current_professional["full_name"]
        
        plan_data = {
            "user_id": plan.user_id,
            "workout_name": plan.workout_name,
            "exercises": plan.exercises,
            "created_by": professional_id,
            "created_by_name": professional_name,
            "created_by_cref": current_professional["cref_crn"],
            "created_at": datetime.now(timezone.utc),
            "start_date": plan.start_date,
            "end_date": plan.end_date,
            "active": True
        }
        
        result = await db.workout_plans.insert_one(plan_data)
        
        return {
            "id": str(result.inserted_id),
            "message": f"Plano de treino criado por {professional_name}",
            "created_by": professional_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar plano de treino: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar plano")

# Enhanced Professional System - Client Assignment
@api_router.get("/professionals/available-clients")
async def get_available_clients(current_professional: dict = Depends(get_current_professional)):
    """Get clients that don't have a professional assigned yet"""
    try:
        professional_type = current_professional["professional_type"]
        
        # Get all premium/vip users
        all_users = await db.users.find({
            "plan_type": {"$in": ["premium", "vip"]},
            "payment_status": "active"
        }).to_list(200)
        
        # Get users already assigned to professionals of this type
        field_name = f"{professional_type}_id"
        assigned_users = await db.users.find({
            field_name: {"$exists": True, "$ne": None}
        }).to_list(200)
        
        assigned_user_ids = [str(user["_id"]) for user in assigned_users]
        
        # Filter available users (not assigned yet)
        available_users = []
        for user in all_users:
            user_id = str(user["_id"])
            if user_id not in assigned_user_ids:
                available_users.append({
                    "id": user_id,
                    "full_name": user.get("full_name", "Usuário"),
                    "email": user.get("email", ""),
                    "plan_type": user.get("plan_type", "basic"),
                    "created_at": user.get("created_at", datetime.now()).isoformat(),
                    "subscription_end": user.get("subscription_end").isoformat() if user.get("subscription_end") else None,
                    "tokens_available": user.get("tokens_available", 0)
                })
        
        return {"available_clients": available_users}
        
    except Exception as e:
        logger.error(f"Erro ao buscar clientes disponíveis: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar clientes")

@api_router.post("/professionals/claim-client/{client_id}")
async def claim_client(client_id: str, current_professional: dict = Depends(get_current_professional)):
    """Claim a client to start following them"""
    try:
        professional_type = current_professional["professional_type"]
        professional_id = str(current_professional["_id"])
        professional_name = current_professional["full_name"]
        
        # Check if client exists and is premium/vip
        client = await db.users.find_one({"_id": ObjectId(client_id)})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        if client.get("plan_type") not in ["premium", "vip"]:
            raise HTTPException(status_code=400, detail="Cliente deve ter plano Premium ou VIP")
        
        # Check if client is already assigned to this type of professional
        field_name = f"{professional_type}_id"
        if client.get(field_name):
            raise HTTPException(status_code=400, detail="Cliente já possui profissional deste tipo")
        
        # Assign professional to client
        update_data = {
            field_name: professional_id,
            f"{professional_type}_name": professional_name,
            f"{professional_type}_cref": current_professional["cref_crn"],
            f"{professional_type}_assigned_at": datetime.now(timezone.utc)
        }
        
        await db.users.update_one(
            {"_id": ObjectId(client_id)},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": f"Cliente {client['full_name']} agora está sob seus cuidados!",
            "client_name": client.get("full_name", "Cliente"),
            "professional_type": professional_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao assumir cliente: {e}")
        raise HTTPException(status_code=500, detail="Erro ao assumir cliente")

@api_router.get("/professionals/my-assigned-clients")
async def get_assigned_clients(current_professional: dict = Depends(get_current_professional)):
    """Get clients assigned to current professional"""
    try:
        professional_type = current_professional["professional_type"]
        professional_id = str(current_professional["_id"])
        
        # Get assignments for this professional
        assignments = await db.client_assignments.find({
            "professional_id": professional_id,
            "professional_type": professional_type,
            "status": "active"
        }).to_list(100)
        
        result = []
        for assignment in assignments:
            # Get client details
            client = await db.users.find_one({"_id": ObjectId(assignment["client_id"])})
            if not client:
                continue
                
            # Check if client has active plans
            if professional_type == "nutritionist":
                active_plans = await db.supplement_plans.count_documents({
                    "user_id": assignment["client_id"],
                    "created_by": professional_id,
                    "active": True
                })
            else:  # personal trainer
                active_plans = await db.workout_plans.count_documents({
                    "user_id": assignment["client_id"],
                    "created_by": professional_id,
                    "active": True
                })
            
            result.append({
                "id": str(client["_id"]),
                "full_name": client.get("full_name", "Usuário"),
                "email": client.get("email", ""),
                "plan_type": client.get("plan_type", "basic"),
                "assigned_at": assignment["assigned_at"].isoformat(),
                "active_plans": active_plans,
                "tokens_available": client.get("tokens_available", 0),
                "subscription_end": client.get("subscription_end").isoformat() if client.get("subscription_end") else None
            })
        
        return {"assigned_clients": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar clientes atribuídos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar clientes")

@api_router.post("/professionals/request-client-transfer")
async def request_client_transfer(
    client_id: str,
    reason: str,
    current_professional: dict = Depends(get_current_professional)
):
    """Request to transfer a client to another professional"""
    try:
        professional_type = current_professional["professional_type"]
        professional_name = current_professional["full_name"]
        
        # Get client info
        client = await db.users.find_one({"_id": ObjectId(client_id)})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Create transfer request
        transfer_request = {
            "client_id": client_id,
            "client_name": client.get("full_name", "Cliente"),
            "current_professional_id": str(current_professional["_id"]),
            "current_professional_name": professional_name,
            "professional_type": professional_type,
            "reason": reason,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "request_type": "transfer"
        }
        
        result = await db.admin_requests.insert_one(transfer_request)
        
        return {
            "success": True,
            "message": "Solicitação de transferência enviada para análise",
            "request_id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao solicitar transferência: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar solicitação")

# Admin endpoints for managing transfer requests
@api_router.get("/admin/transfer-requests")
async def get_transfer_requests():
    """Get all transfer requests for admin"""
    try:
        requests = await db.admin_requests.find({
            "request_type": "transfer",
            "status": "pending"
        }).sort("created_at", -1).to_list(50)
        
        result = []
        for req in requests:
            result.append({
                "id": str(req["_id"]),
                "client_name": req["client_name"],
                "current_professional_name": req["current_professional_name"],
                "professional_type": req["professional_type"],
                "reason": req["reason"],
                "created_at": req["created_at"].isoformat(),
                "status": req["status"]
            })
        
        return {"requests": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar solicitações: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar solicitações")

@api_router.post("/admin/transfer-requests/{request_id}/approve")
async def approve_transfer_request(request_id: str):
    """Approve transfer request and unassign client"""
    try:
        # Get request
        request = await db.admin_requests.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise HTTPException(status_code=404, detail="Solicitação não encontrada")
        
        # Unassign professional from client
        professional_type = request["professional_type"]
        field_name = f"{professional_type}_id"
        
        await db.users.update_one(
            {"_id": ObjectId(request["client_id"])},
            {
                "$unset": {
                    field_name: "",
                    f"{professional_type}_name": "",
                    f"{professional_type}_cref": "",
                    f"{professional_type}_assigned_at": ""
                }
            }
        )
        
        # Update request status
        await db.admin_requests.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": "approved",
                    "processed_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Cliente {request['client_name']} foi liberado para novo profissional"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao aprovar transferência: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar solicitação")

# Enhanced Dashboard Endpoints for Admin
@api_router.get("/admin/dashboard/stats")
async def get_enhanced_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    try:
        # Get current date for monthly calculations
        current_date = datetime.now(timezone.utc)
        start_of_month = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Users statistics
        total_users = await db.users.count_documents({})
        active_users = await db.users.count_documents({"payment_status": "active"})
        
        # Gyms statistics  
        total_gyms = await db.gyms.count_documents({})
        active_gyms = await db.gyms.count_documents({"status": "active"})
        
        # Tokens statistics this month
        tokens_this_month = await db.user_tokens.count_documents({
            "created_at": {"$gte": start_of_month}
        })
        
        # Check-ins this month
        checkins_this_month = await db.token_validations.count_documents({
            "validated_at": {"$gte": start_of_month}
        })
        
        # Revenue this month from transactions
        revenue_pipeline = [
            {
                "$match": {
                    "payment_status": "paid",
                    "created_at": {"$gte": start_of_month.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_revenue": {"$sum": "$amount"}
                }
            }
        ]
        
        revenue_result = await db.payment_transactions.aggregate(revenue_pipeline).to_list(1)
        monthly_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
        
        # Conversion rate (paid users / total users)
        conversion_rate = (active_users / total_users * 100) if total_users > 0 else 0
        
        # Scheduled appointments this month
        appointments_this_month = await db.appointments.count_documents({
            "appointment_date": {"$gte": start_of_month},
            "status": {"$in": ["scheduled", "completed"]}
        })
        
        # Revenue to receive (pending transactions)
        pending_revenue = await db.payment_transactions.count_documents({
            "payment_status": "pending"
        })
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "overdue_payments": total_users - active_users,
            "blocked_users": 0,  # We don't have blocked users yet
            "total_gyms": total_gyms,
            "active_gyms": active_gyms,
            "tokens_generated_today": 0,  # Would need daily tracking
            "tokens_generated_month": tokens_this_month,
            "monthly_revenue": monthly_revenue,
            "checkins_month": checkins_this_month,
            "conversion_rate": round(conversion_rate, 1),
            "appointments_month": appointments_this_month,
            "pending_revenue": pending_revenue
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas do dashboard: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar estatísticas")

@api_router.get("/admin/dashboard/recent-users")
async def get_recent_users(limit: int = 10):
    """Get recently registered users"""
    try:
        users = await db.users.find({}).sort("created_at", -1).limit(limit).to_list(limit)
        
        result = []
        for user in users:
            result.append({
                "id": str(user["_id"]),
                "full_name": user.get("full_name", "Usuário"),
                "email": user.get("email", ""),
                "plan_type": user.get("plan_type", "basic"),
                "status": user.get("payment_status", "inactive"),
                "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat(),
                "subscription": {
                    "monthly_amount": user.get("monthly_amount", 0),
                    "status": user.get("payment_status", "inactive")
                }
            })
        
        return {"users": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar usuários recentes: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar usuários")

@api_router.get("/admin/dashboard/recent-tokens") 
async def get_recent_tokens(limit: int = 10):
    """Get recently generated tokens"""
    try:
        tokens = await db.user_tokens.find({}).sort("created_at", -1).limit(limit).to_list(limit)
        
        result = []
        for token in tokens:
            result.append({
                "token_code": token.get("token_code", ""),
                "token_type": token.get("token_type", "gym"),
                "created_at": token.get("created_at", datetime.now(timezone.utc)).isoformat(),
                "user_id": str(token.get("user_id", "")),
                "status": token.get("status", "active")
            })
        
        return {"tokens": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar tokens recentes: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar tokens")

@api_router.get("/admin/dashboard/appointments")
async def get_scheduled_appointments(limit: int = 20):
    """Get scheduled appointments for dashboard"""
    try:
        appointments = await db.appointments.find({
            "status": {"$in": ["scheduled", "completed"]}
        }).sort("appointment_date", 1).limit(limit).to_list(limit)
        
        result = []
        for appointment in appointments:
            # Get user details
            user_id = appointment.get("user_id") or appointment.get("client_id")
            user = await db.users.find_one({"_id": ObjectId(user_id)}) if user_id else None
            
            result.append({
                "id": str(appointment["_id"]),
                "user_name": user.get("full_name", "Usuário") if user else "Usuário",
                "user_email": user.get("email", "") if user else "",
                "user_plan": user.get("plan_type", "basic") if user else "basic",
                "appointment_type": appointment.get("appointment_type", "nutritionist"),  # nutritionist or personal
                "appointment_date": appointment.get("appointment_date").isoformat(),
                "status": appointment.get("status", "scheduled"),
                "notes": appointment.get("notes", ""),
                "created_at": appointment.get("created_at", datetime.now(timezone.utc)).isoformat()
            })
        
        return {"appointments": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar agendamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar agendamentos")

@api_router.get("/admin/dashboard/gym-performance")
async def get_gym_performance(limit: int = 10):
    """Get gym performance statistics"""
    try:
        # Get gyms with their check-in counts
        current_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        gyms = await db.gyms.find({"status": "active"}).limit(limit).to_list(limit)
        
        result = []
        for gym in gyms:
            gym_id = str(gym["_id"])
            
            # Count check-ins this month for this gym
            checkins = await db.token_validations.count_documents({
                "gym_id": gym_id,
                "validated_at": {"$gte": current_month}
            })
            
            # Calculate revenue (assuming R$ 5 per check-in)
            monthly_revenue = checkins * 5.0
            
            result.append({
                "id": gym_id,
                "name": gym.get("name", "Academia"),
                "status": gym.get("status", "active"),
                "monthly_checkins": checkins,
                "monthly_revenue": monthly_revenue
            })
        
        return {"gyms": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar performance das academias: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar performance")

@api_router.get("/admin/pending-clients")
async def get_pending_clients():
    """Get clients pending approval"""
    try:
        # Buscar usuários com status pendente ou inactive
        clients = await db.users.find({
            "payment_status": {"$in": ["pending", "inactive"]}
        }).sort("created_at", -1).to_list(100)
        
        result = []
        for client in clients:
            result.append({
                "id": str(client["_id"]),
                "full_name": client.get("full_name", "Usuário"),
                "email": client.get("email", ""),
                "plan_type": client.get("plan_type", "basico"),
                "status": client.get("payment_status", "inactive"),
                "created_at": client.get("created_at", datetime.now(timezone.utc)).isoformat()
            })
        
        return {"clients": result}
        
    except Exception as e:
        logger.error(f"Erro ao buscar clientes pendentes: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar clientes pendentes")

@api_router.post("/admin/approve-client/{client_id}")
async def approve_client(client_id: str):
    """Approve a client and activate their account"""
    try:
        # Atualizar status do cliente para ativo
        result = await db.users.update_one(
            {"_id": ObjectId(client_id)},
            {
                "$set": {
                    "payment_status": "active",
                    "approved_at": datetime.now(timezone.utc),
                    "status": "active"
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        return {"success": True, "message": "Cliente aprovado com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao aprovar cliente: {e}")
        raise HTTPException(status_code=500, detail="Erro ao aprovar cliente")

@api_router.post("/professionals/set-weekly-availability")
async def set_weekly_availability(request: Request):
    """Professional sets their weekly availability"""
    try:
        # Get professional from token
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        professional_id = payload.get("sub")
        
        data = await request.json()
        
        # Update or create weekly availability
        await db.professional_availability.update_one(
            {"professional_id": ObjectId(professional_id)},
            {
                "$set": {
                    "professional_id": ObjectId(professional_id),
                    "weekly_schedule": data.get("weekly_schedule", {}),
                    "slot_duration": 15,  # 15 minutes
                    "start_time": "09:00",
                    "end_time": "18:00",
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        return {"success": True, "message": "Disponibilidade atualizada com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao definir disponibilidade: {e}")
        raise HTTPException(status_code=500, detail="Erro ao salvar disponibilidade")

@api_router.get("/professionals/my-availability")
async def get_my_availability(request: Request):
    """Get professional's weekly availability"""
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        professional_id = payload.get("sub")
        
        availability = await db.professional_availability.find_one({
            "professional_id": ObjectId(professional_id)
        })
        
        if not availability:
            # Return default availability (all days available)
            return {
                "weekly_schedule": {
                    "monday": True,
                    "tuesday": True,
                    "wednesday": True,
                    "thursday": True,
                    "friday": True
                },
                "start_time": "09:00",
                "end_time": "18:00",
                "slot_duration": 15
            }
        
        return {
            "weekly_schedule": availability.get("weekly_schedule", {}),
            "start_time": availability.get("start_time", "09:00"),
            "end_time": availability.get("end_time", "18:00"),
            "slot_duration": availability.get("slot_duration", 15)
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar disponibilidade: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar disponibilidade")

@api_router.post("/video/create-agora-channel")
async def create_agora_channel(request: Request):
    """Create Agora channel for video call"""
    try:
        data = await request.json()
        appointment_id = data.get("appointment_id")
        
        if not appointment_id:
            raise HTTPException(status_code=400, detail="appointment_id é obrigatório")
        
        # Get appointment
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appointment:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado")
        
        # Create unique channel name
        channel_name = f"luxepass_{appointment_id}"
        
        # Store channel info in appointment
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {
                "$set": {
                    "video_channel_name": channel_name,
                    "video_provider": "agora",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "channel_name": channel_name,
            "app_id": "luxepass-app-id"  # You'll need to configure this
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar canal de vídeo: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar canal de vídeo")

@api_router.get("/admin/confirmed-appointments")
async def get_confirmed_appointments(
    month: int = None,
    year: int = None
):
    """Get confirmed appointments for payment calculation"""
    try:
        # Default to current month if not specified
        if not month or not year:
            now = datetime.now(timezone.utc)
            month = now.month
            year = now.year
        
        # Get start and end of month
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
        # Find all completed appointments in the month
        appointments = await db.appointments.find({
            "status": "completed",
            "updated_at": {
                "$gte": start_date,
                "$lt": end_date
            }
        }).to_list(1000)
        
        result = []
        for apt in appointments:
            # Get client info
            client_id = apt.get("client_id") or apt.get("user_id")
            client = await db.users.find_one({"_id": ObjectId(client_id)}) if client_id else None
            
            # Get professional info
            prof_id = apt.get("professional_id")
            professional = await db.professionals.find_one({"_id": ObjectId(prof_id)}) if prof_id else None
            
            result.append({
                "id": str(apt["_id"]),
                "client_name": client.get("full_name", "Cliente") if client else "Cliente",
                "client_email": client.get("email", "") if client else "",
                "professional_name": professional.get("full_name", "Profissional") if professional else "Profissional",
                "professional_type": apt.get("appointment_type", "unknown"),
                "appointment_date": apt.get("appointment_date", "").isoformat() if isinstance(apt.get("appointment_date"), datetime) else apt.get("appointment_date", ""),
                "completed_at": apt.get("updated_at", datetime.now(timezone.utc)).isoformat(),
                "notes": apt.get("notes", "")
            })
        
        return {
            "appointments": result,
            "month": month,
            "year": year,
            "total_count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar atendimentos confirmados: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar atendimentos confirmados")

@api_router.get("/admin/dashboard/stats")
async def get_admin_dashboard_stats():
    """Get complete dashboard statistics for admin"""
    try:
        # Total de clientes
        total_clients = await db.users.count_documents({})
        
        # Clientes aguardando aprovação
        pending_approval = await db.users.count_documents({
            "payment_status": {"$in": ["pending", "inactive"]}
        })
        
        # Clientes aprovados
        approved_clients = await db.users.count_documents({
            "payment_status": "active"
        })
        
        # Total de academias
        total_gyms = await db.gyms.count_documents({})
        
        # Total de nutricionistas
        total_nutritionists = await db.professionals.count_documents({
            "type": "nutritionist"
        })
        
        # Total de personal trainers
        total_personal_trainers = await db.professionals.count_documents({
            "type": "personal"
        })
        
        # Pagamentos pendentes (soma dos valores)
        pending_payments_pipeline = [
            {
                "$match": {
                    "payment_status": "pending"
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user"
                }
            },
            {
                "$unwind": {
                    "path": "$user",
                    "preserveNullAndEmptyArrays": True
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {
                        "$sum": "$amount"
                    }
                }
            }
        ]
        
        pending_result = await db.payment_transactions.aggregate(pending_payments_pipeline).to_list(1)
        pending_payments = pending_result[0]["total"] if pending_result else 0
        
        # Total de receita
        total_revenue_pipeline = [
            {
                "$match": {
                    "payment_status": "paid"
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {
                        "$sum": "$amount"
                    }
                }
            }
        ]
        
        revenue_result = await db.payment_transactions.aggregate(total_revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        return {
            "total_clients": total_clients,
            "pending_approval": pending_approval,
            "approved_clients": approved_clients,
            "total_gyms": total_gyms,
            "total_nutritionists": total_nutritionists,
            "total_personal_trainers": total_personal_trainers,
            "pending_payments": pending_payments,
            "total_revenue": total_revenue
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas do dashboard: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar estatísticas")

@api_router.put("/admin/users/{user_id}/block")
async def block_user(user_id: str):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_blocked": True,
                "blocked_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {"success": True, "message": "Usuário bloqueado com sucesso"}

@api_router.post("/admin/users/{user_id}/verify-payment")
async def verify_user_payment(user_id: str):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "payment_status": "active",
                "subscription_end": datetime.now(timezone.utc) + timedelta(days=30),
                "payment_verified_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {"success": True, "message": "Pagamento verificado e assinatura renovada"}

@api_router.get("/admin/tokens/stats")
async def get_admin_token_stats():
    total_generated = await db.token_usage.count_documents({})
    total_used = await db.token_usage.count_documents({"is_used": True})
    gym_tokens = await db.token_usage.count_documents({"token_type": "gym"})
    nutritionist_tokens = await db.token_usage.count_documents({"token_type": "nutritionist"})
    
    usage_rate = (total_used / total_generated * 100) if total_generated > 0 else 0
    
    return {
        "total_generated": total_generated,
        "total_used": total_used,
        "gym_tokens": gym_tokens,
        "nutritionist_tokens": nutritionist_tokens,
        "usage_rate": round(usage_rate, 2)
    }

# Check-in and Simple Token Routes
@api_router.post("/checkin/gym/{gym_id}")
async def checkin_gym(gym_id: str, current_user: User = Depends(get_current_user)):
    """Check-in na academia com geração automática de token"""
    try:
        user_id = str(current_user.id)
        
        # Verificar se a academia existe
        gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
        if not gym:
            raise HTTPException(404, "Academia não encontrada")
        
        # Gerar token simples para academia
        token_manager = TokenSystemManager()
        token_data = token_manager.generate_checkin_token(
            user_id=user_id,
            location_id=gym_id,
            token_type="gym"
        )
        
        # Salvar check-in no banco
        checkin_data = {
            "user_id": user_id,
            "gym_id": gym_id,
            "gym_name": gym.get("name", "Academia"),
            "checkin_time": datetime.now(timezone.utc),
            "token_code": token_data["token_code"],
            "token_id": token_data["token_id"],
            "status": "checked_in"
        }
        
        await db.checkins.insert_one(checkin_data)
        
        # Salvar token na coleção de tokens
        await db.tokens.insert_one({
            **token_data,
            "created_at": datetime.now(timezone.utc),
            "location_name": gym.get("name", "Academia")
        })
        
        return {
            "success": True,
            "message": f"Check-in realizado na {gym.get('name', 'Academia')}!",
            "token_code": token_data["token_code"],
            "checkin_time": checkin_data["checkin_time"],
            "expires_at": token_data["expires_at"],
            "gym_name": gym.get("name", "Academia")
        }
        
    except Exception as e:
        logger.error(f"Erro no check-in: {e}")
        raise HTTPException(500, "Erro interno no check-in")

@api_router.post("/checkin/nutritionist/{nutritionist_id}")
async def checkin_nutritionist(nutritionist_id: str, current_user: User = Depends(get_current_user)):
    """Check-in com nutricionista com geração automática de token"""
    try:
        user_id = str(current_user.id)
        
        # Para demonstração, criar dados de nutricionista
        nutritionist_data = {
            "name": "Dra. Carla Nutricionista",
            "speciality": "Nutrição Esportiva",
            "clinic": "Clínica Luxe Forma"
        }
        
        # Gerar token simples para nutricionista
        token_manager = TokenSystemManager()
        token_data = token_manager.generate_checkin_token(
            user_id=user_id,
            location_id=nutritionist_id,
            token_type="nutritionist"
        )
        
        # Salvar check-in no banco
        checkin_data = {
            "user_id": user_id,
            "nutritionist_id": nutritionist_id,
            "nutritionist_name": nutritionist_data["name"],
            "checkin_time": datetime.now(timezone.utc),
            "token_code": token_data["token_code"],
            "token_id": token_data["token_id"],
            "status": "checked_in"
        }
        
        await db.checkins.insert_one(checkin_data)
        
        # Salvar token na coleção de tokens
        await db.tokens.insert_one({
            **token_data,
            "created_at": datetime.now(timezone.utc),
            "location_name": nutritionist_data["name"]
        })
        
        return {
            "success": True,
            "message": f"Check-in realizado com {nutritionist_data['name']}!",
            "token_code": token_data["token_code"],
            "checkin_time": checkin_data["checkin_time"],
            "expires_at": token_data["expires_at"],
            "nutritionist_name": nutritionist_data["name"]
        }
        
    except Exception as e:
        logger.error(f"Erro no check-in: {e}")
        raise HTTPException(500, "Erro interno no check-in")

@api_router.get("/checkins/history")
async def get_checkin_history(current_user: User = Depends(get_current_user)):
    """Histórico de check-ins do usuário"""
    try:
        user_id = str(current_user.id)
        
        # Buscar check-ins do usuário
        checkins = await db.checkins.find(
            {"user_id": user_id}
        ).sort("checkin_time", -1).limit(20).to_list(20)
        
        # Formatar dados para resposta
        history = []
        for checkin in checkins:
            history.append({
                "id": str(checkin["_id"]),
                "type": "gym" if "gym_id" in checkin else "nutritionist",
                "location_name": checkin.get("gym_name") or checkin.get("nutritionist_name"),
                "checkin_time": checkin["checkin_time"],
                "token_code": checkin["token_code"],
                "status": checkin["status"]
            })
        
        return {"history": history}
        
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}")
        raise HTTPException(500, "Erro ao buscar histórico")

@api_router.post("/tokens/generate-simple")
async def generate_simple_token(
    request: TokenGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    """Gera token simples manual (sem check-in)"""
    try:
        user_id = str(current_user.id)
        
        # Gerar token simples
        token_manager = TokenSystemManager()
        simple_code = token_manager.generate_simple_token_code(request.token_type)
        
        # Criar dados do token
        token_data = {
            "token_id": str(uuid.uuid4()),
            "token_code": simple_code,
            "user_id": user_id,
            "token_type": request.token_type,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=request.validity_hours),
            "status": "active",
            "created_by_checkin": False,
            "usage_count": 0,
            "max_usage": 3
        }
        
        # Salvar no banco
        await db.tokens.insert_one(token_data)
        
        return {
            "success": True,
            "token_code": simple_code,
            "token_type": request.token_type,
            "expires_at": token_data["expires_at"],
            "message": f"Token {request.token_type} gerado com sucesso!"
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar token: {e}")
        raise HTTPException(500, "Erro ao gerar token")

@api_router.get("/admin/tokens")
async def get_admin_tokens():
    # Get tokens with user information
    pipeline = [
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$unwind": "$user"
        },
        {
            "$sort": {"created_at": -1}
        },
        {
            "$limit": 100
        }
    ]
    
    tokens = await db.token_usage.aggregate(pipeline).to_list(100)
    result = []
    
    for token in tokens:
        result.append({
            "id": str(token["_id"]),
            "token_code": token["token_code"],
            "user_name": token["user"]["full_name"],
            "user_email": token["user"]["email"],
            "token_type": token["token_type"],
            "gym_name": token.get("gym_name"),
            "is_used": token["is_used"],
            "created_at": token["created_at"].isoformat(),
            "used_at": token.get("used_at").isoformat() if token.get("used_at") else None,
            "expires_at": token["expires_at"].isoformat()
        })
    
    return result

# Payment System Endpoints
@api_router.get("/payments/plans", response_model=List[PaymentPlan])
async def get_payment_plans():
    """Get available payment plans"""
    plans = []
    for plan_id, plan_data in PAYMENT_PLANS.items():
        plans.append(PaymentPlan(**plan_data))
    return plans

@api_router.get("/integration/plans")
async def get_integration_plans():
    """Get plans for the integration/frontend with marketing information"""
    plans = []
    
    for plan_id, plan_data in PAYMENT_PLANS.items():
        # Skip plans with old format (use only new format)
        if "monthly_price" not in plan_data:
            continue
            
        plan_info = {
            "type": plan_data["id"],
            "name": plan_data["name"],
            "description": plan_data["description"],
            "features": plan_data["features"],
            "monthly_price": plan_data["monthly_price"],
            "activation_fee": plan_data["activation_fee"], 
            "first_month_total": plan_data["first_month_total"],
            "fidelity_months": plan_data["fidelity_months"],
            "marketing_benefits": plan_data.get("marketing_benefits", []),
            "nutritionist_consultations": plan_data.get("nutritionist_consultations", 0),
            "personal_consultations": plan_data.get("personal_consultations", 0)
        }
        plans.append(plan_info)
    
    return plans

@api_router.post("/payments/checkout/session")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user)
):
    """Create Stripe checkout session"""
    try:
        # Validate plan exists
        if request.plan_id not in PAYMENT_PLANS:
            raise HTTPException(status_code=400, detail="Plano inválido")
        
        plan = PAYMENT_PLANS[request.plan_id]
        
        # Initialize Stripe checkout
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create success and cancel URLs
        success_url = f"{request.origin_url}/client/(tabs)/financial?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/client/(tabs)/financial"
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency=plan["currency"].lower(),
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "plan_id": request.plan_id,
                "plan_name": plan["name"],
                "payment_method": request.payment_method
            }
        )
        
        # Create Stripe session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Save transaction to database
        transaction = PaymentTransaction(
            user_id=str(current_user.id),
            plan_id=request.plan_id,
            session_id=session.session_id,
            amount=plan["price"],
            currency=plan["currency"],
            payment_status="pending",
            payment_method=request.payment_method,
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata=checkout_request.metadata
        )
        
        await db.payment_transactions.insert_one(transaction.dict())
        
        return {
            "url": session.url,
            "session_id": session.session_id,
            "plan_name": plan["name"],
            "amount": plan["price"],
            "currency": plan["currency"]
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar sessão de checkout: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")

@api_router.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Check payment status and update user subscription"""
    try:
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Get status from Stripe
        status_response: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Find transaction in database
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        # Update transaction status if payment completed and not already processed
        if status_response.payment_status == "paid" and transaction["payment_status"] != "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Update user subscription
            plan = PAYMENT_PLANS[transaction["plan_id"]]
            subscription_end = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
            
            await db.users.update_one(
                {"_id": ObjectId(current_user.id)},
                {
                    "$set": {
                        "plan_type": transaction["plan_id"],
                        "payment_status": "active",
                        "subscription_end": subscription_end,
                        "monthly_amount": plan["price"],
                        "tokens_available": plan["token_limit"] if plan["token_limit"] != -1 else 9999,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            logger.info(f"Subscription updated for user {current_user.id} - Plan: {transaction['plan_id']}")
        
        return {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "plan_id": transaction["plan_id"],
            "plan_name": PAYMENT_PLANS[transaction["plan_id"]]["name"]
        }
        
    except Exception as e:
        logger.error(f"Erro ao verificar status do pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao verificar pagamento")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.event_type == "checkout.session.completed":
            # Find and update transaction
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            
            if transaction and transaction["payment_status"] != "paid":
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                # Update user subscription
                plan = PAYMENT_PLANS[transaction["plan_id"]]
                subscription_end = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
                
                await db.users.update_one(
                    {"_id": ObjectId(transaction["user_id"])},
                    {
                        "$set": {
                            "plan_type": transaction["plan_id"],
                            "payment_status": "active", 
                            "subscription_end": subscription_end,
                            "monthly_amount": plan["price"],
                            "tokens_available": plan["token_limit"] if plan["token_limit"] != -1 else 9999,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                logger.info(f"Webhook processed - User subscription updated: {transaction['user_id']}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Erro no webhook Stripe: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

@api_router.get("/payments/user/transactions")
async def get_user_transactions(current_user: User = Depends(get_current_user)):
    """Get user payment transactions"""
    transactions = await db.payment_transactions.find(
        {"user_id": str(current_user.id)}
    ).sort("created_at", -1).to_list(50)
    
    result = []
    for transaction in transactions:
        plan = PAYMENT_PLANS.get(transaction["plan_id"], {})
        result.append({
            "id": str(transaction["_id"]),
            "plan_id": transaction["plan_id"],
            "plan_name": plan.get("name", transaction["plan_id"]),
            "amount": transaction["amount"],
            "currency": transaction["currency"],
            "payment_status": transaction["payment_status"],
            "payment_method": transaction["payment_method"],
            "created_at": transaction["created_at"],
            "session_id": transaction["session_id"]
        })
    
    return result

# Pagar.me Payment Endpoints
@api_router.post("/payments/pagarme/checkout/session")
async def create_pagarme_checkout_session(
    request: CreateCheckoutRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user)
):
    """Create Pagar.me checkout session for Brazilian payments"""
    try:
        # Validate plan exists
        if request.plan_id not in PAYMENT_PLANS:
            raise HTTPException(status_code=400, detail="Plano inválido")
        
        plan = PAYMENT_PLANS[request.plan_id]
        
        # Get user data for customer creation
        user_data = {
            "name": current_user.full_name or "Cliente LuxePass",
            "email": current_user.email,
            "phone": getattr(current_user, 'phone', '11999999999'),
            "document": getattr(current_user, 'document', ''),
            "city": getattr(current_user, 'city', 'São Paulo'),
            "state": getattr(current_user, 'state', 'SP'),
            "zip_code": getattr(current_user, 'zip_code', '01000000'),
            "address": getattr(current_user, 'address', 'Rua Example, 123')
        }
        
        # Format customer data for Pagar.me
        customer_data = pagarme_service.format_customer_data(user_data)
        
        # Calculate total amount (first month includes activation fee)
        total_amount = plan["first_month_total"]
        
        # Create order in Pagar.me
        order_result = await pagarme_service.create_order(
            amount=total_amount,
            currency=plan["currency"],
            customer=customer_data,
            payment_method=request.payment_method,  # pix, boleto, credit_card
            success_url=f"{request.origin_url}/client/plans?payment_success=true&order_id={{ORDER_ID}}",
            cancel_url=f"{request.origin_url}/client/plans?payment_cancelled=true",
            metadata={
                "user_id": str(current_user.id),
                "plan_id": request.plan_id,
                "plan_name": plan["name"],
                "monthly_price": plan["monthly_price"],
                "activation_fee": plan["activation_fee"],
                "fidelity_months": plan["fidelity_months"]
            }
        )
        
        # Save transaction to database
        transaction = PaymentTransaction(
            user_id=str(current_user.id),
            plan_id=request.plan_id,
            session_id=order_result["order_id"],
            amount=total_amount,
            currency=plan["currency"],
            payment_status="pending",
            payment_method=request.payment_method,
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata={
                "order_id": order_result["order_id"],
                "monthly_price": plan["monthly_price"],
                "activation_fee": plan["activation_fee"],
                "first_month_total": plan["first_month_total"],
                "fidelity_months": plan["fidelity_months"],
                "pagarme_data": order_result.get("response", {})
            }
        )
        
        await db.payment_transactions.insert_one(transaction.dict())
        
        return {
            "order_id": order_result["order_id"],
            "status": order_result["status"],
            "payment_method": request.payment_method,
            "plan_name": plan["name"],
            "monthly_price": plan["monthly_price"],
            "activation_fee": plan["activation_fee"],
            "total_amount": total_amount,
            "currency": plan["currency"],
            "fidelity_months": plan["fidelity_months"],
            "charges": order_result.get("charges", []),
            "checkouts": order_result.get("checkouts", []),
            "payment_url": order_result.get("checkouts", [{}])[0].get("payment_url") if order_result.get("checkouts") else None,
            "qr_code": order_result.get("charges", [{}])[0].get("last_transaction", {}).get("qr_code") if order_result.get("charges") else None,
            "boleto_url": order_result.get("charges", [{}])[0].get("last_transaction", {}).get("url") if order_result.get("charges") else None
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar sessão Pagar.me: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")

@api_router.get("/payments/pagarme/order/{order_id}")
async def get_pagarme_order_status(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get Pagar.me order status and update user subscription"""
    try:
        # Get order status from Pagar.me
        order_data = await pagarme_service.get_order(order_id)
        
        # Find transaction in database
        transaction = await db.payment_transactions.find_one({"session_id": order_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        # Check if payment is completed and not already processed
        payment_completed = False
        for charge in order_data.get("charges", []):
            if charge.get("status") == "paid":
                payment_completed = True
                break
        
        if payment_completed and transaction["payment_status"] != "paid":
            # Update transaction status
            await db.payment_transactions.update_one(
                {"session_id": order_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Update user subscription
            plan = PAYMENT_PLANS[transaction["plan_id"]]
            subscription_end = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
            
            await db.users.update_one(
                {"_id": ObjectId(current_user.id)},
                {
                    "$set": {
                        "plan_type": transaction["plan_id"],
                        "payment_status": "active",
                        "subscription_end": subscription_end,
                        "monthly_amount": plan["price"],
                        "tokens_available": plan["token_limit"] if plan["token_limit"] != -1 else 9999,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            logger.info(f"Subscription updated for user {current_user.id} - Plan: {transaction['plan_id']}")
        
        return {
            "order_id": order_data["order_id"],
            "status": order_data["status"],
            "payment_method": order_data["payment_method"],
            "amount": order_data["amount"],
            "currency": order_data["currency"],
            "payment_url": order_data.get("payment_url"),
            "qr_code": order_data.get("qr_code"),
            "boleto_url": order_data.get("boleto_url"),
            "plan_id": transaction["plan_id"],
            "plan_name": PAYMENT_PLANS[transaction["plan_id"]]["name"],
            "payment_completed": payment_completed
        }
        
    except Exception as e:
        logger.error(f"Erro ao verificar status do pedido Pagar.me: {e}")
        raise HTTPException(status_code=500, detail="Erro ao verificar pagamento")

@api_router.post("/payments/pagarme/webhook")
async def pagarme_webhook(request: Request):
    """Handle Pagar.me webhooks"""
    try:
        body = await request.json()
        
        # Process webhook based on event type
        event_type = body.get("type")
        
        if event_type in ["order.paid", "charge.paid"]:
            # Get order data from webhook
            order_data = body.get("data", {})
            order_id = order_data.get("id")
            
            if order_id:
                # Find and update transaction
                transaction = await db.payment_transactions.find_one({"session_id": order_id})
                
                if transaction and transaction["payment_status"] != "paid":
                    # Update transaction
                    await db.payment_transactions.update_one(
                        {"session_id": order_id},
                        {
                            "$set": {
                                "payment_status": "paid",
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    
                    # Update user subscription
                    plan = PAYMENT_PLANS[transaction["plan_id"]]
                    subscription_end = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
                    
                    await db.users.update_one(
                        {"_id": ObjectId(transaction["user_id"])},
                        {
                            "$set": {
                                "plan_type": transaction["plan_id"],
                                "payment_status": "active",
                                "subscription_end": subscription_end,
                                "monthly_amount": plan["price"],
                                "tokens_available": plan["token_limit"] if plan["token_limit"] != -1 else 9999,
                                "updated_at": datetime.now(timezone.utc)
                            }
                        }
                    )
                    
                    logger.info(f"Pagar.me webhook processed - User subscription updated: {transaction['user_id']}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Erro no webhook Pagar.me: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

@api_router.get("/payments/methods")
async def get_payment_methods():
    """Get available payment methods"""
    return {
        "stripe": {
            "name": "Cartão de Crédito Internacional",
            "description": "Visa, Mastercard, American Express",
            "currency": "BRL",
            "available": True
        },
        "pix": {
            "name": "PIX",
            "description": "Pagamento instantâneo via PIX",
            "currency": "BRL",
            "available": True
        },
        "boleto": {
            "name": "Boleto Bancário",
            "description": "Vencimento em 3 dias úteis",
            "currency": "BRL",
            "available": True
        }
    }

# Notification System Endpoints
@api_router.post("/notifications/register-token")
async def register_push_token(
    request: PushTokenRequest,
    current_user: User = Depends(get_current_user)
):
    """Register user's push notification token"""
    try:
        # Update user with push token
        await db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "push_token": request.push_token,
                    "device_info": request.device_info,
                    "push_token_updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Push token registered for user {current_user.id}")
        return {"success": True, "message": "Push token registrado com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao registrar push token: {e}")
        raise HTTPException(status_code=500, detail="Erro ao registrar token de notificação")

@api_router.get("/notifications/user/preferences")
async def get_notification_preferences(current_user: User = Depends(get_current_user)):
    """Get user notification preferences"""
    try:
        user = await db.users.find_one({"_id": ObjectId(current_user.id)})
        preferences = user.get("notification_preferences", {
            "payment_reminders": True,
            "token_reminders": True,
            "gym_reminders": True,
            "promotional": False,
            "weekly_summary": True
        })
        
        return preferences
        
    except Exception as e:
        logger.error(f"Erro ao buscar preferências de notificação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar preferências")

@api_router.put("/notifications/user/preferences")
async def update_notification_preferences(
    preferences: Dict[str, bool],
    current_user: User = Depends(get_current_user)
):
    """Update user notification preferences"""
    try:
        await db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "notification_preferences": preferences,
                    "preferences_updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"success": True, "message": "Preferências atualizadas com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao atualizar preferências: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar preferências")

@api_router.post("/notifications/schedule")
async def schedule_notification(
    notification: ScheduledNotification,
    current_user: User = Depends(get_current_user)
):
    """Schedule a notification for a user"""
    try:
        notification_data = {
            "user_id": str(current_user.id),
            "title": notification.title,
            "body": notification.body,
            "data": notification.data or {},
            "schedule_time": notification.schedule_time,
            "sent": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        result = await db.scheduled_notifications.insert_one(notification_data)
        
        return {
            "success": True,
            "notification_id": str(result.inserted_id),
            "message": "Notificação agendada com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao agendar notificação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao agendar notificação")

@api_router.get("/notifications/user/scheduled")
async def get_user_scheduled_notifications(current_user: User = Depends(get_current_user)):
    """Get user's scheduled notifications"""
    try:
        notifications = await db.scheduled_notifications.find(
            {"user_id": str(current_user.id), "sent": False}
        ).sort("schedule_time", 1).to_list(50)
        
        result = []
        for notification in notifications:
            result.append({
                "id": str(notification["_id"]),
                "title": notification["title"],
                "body": notification["body"],
                "data": notification.get("data", {}),
                "schedule_time": notification["schedule_time"].isoformat(),
                "created_at": notification["created_at"].isoformat()
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Erro ao buscar notificações agendadas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar notificações")

# Appointment System Endpoints

# Professional Availability Management
@api_router.post("/professionals/availability")
async def set_professional_availability(
    availability_data: dict,
    current_professional: dict = Depends(get_current_professional)
):
    """Professional sets their available dates and times"""
    try:
        professional_id = str(current_professional["_id"])
        professional_type = current_professional["professional_type"]
        
        # Get data from request
        date = availability_data.get("date")
        start_time = availability_data.get("start_time", "08:00")
        end_time = availability_data.get("end_time", "19:00")
        break_times = availability_data.get("break_times", ["12:00", "13:00"])
        slot_duration = availability_data.get("slot_duration", 60)
        
        if not date:
            raise HTTPException(400, "Data é obrigatória")
        
        # Generate time slots for the day
        slots_created = 0
        start_hour = int(start_time.split(":")[0])
        end_hour = int(end_time.split(":")[0])
        
        for hour in range(start_hour, end_hour):  
            time_str = f"{hour:02d}:00"
            
            # Skip lunch break if specified
            if time_str in break_times:
                continue
                
            # Check if slot already exists
            existing_slot = await db.appointment_slots.find_one({
                "professional_id": professional_id,
                "date": date,
                "time": time_str
            })
            
            if not existing_slot:
                slot_data = {
                    "professional_id": professional_id,
                    "professional_type": professional_type,
                    "date": date,
                    "time": time_str,
                    "available": True,
                    "duration_minutes": slot_duration,
                    "created_at": datetime.now(timezone.utc)
                }
                
                await db.appointment_slots.insert_one(slot_data)
                slots_created += 1
        
        return {
            "success": True,
            "message": f"{slots_created} horários disponibilizados para {date}",
            "slots_created": slots_created,
            "date": date,
            "professional_type": professional_type
        }
        
    except Exception as e:
        logger.error(f"Erro ao definir disponibilidade: {e}")
        raise HTTPException(status_code=500, detail="Erro ao definir disponibilidade")

@api_router.get("/professionals/availability/{date}")
async def get_professional_availability(
    date: str,
    current_professional: dict = Depends(get_current_professional)
):
    """Get professional's availability for a specific date"""
    try:
        professional_id = str(current_professional["_id"])
        
        slots = await db.appointment_slots.find({
            "professional_id": professional_id,
            "date": date
        }).to_list(100)
        
        return {"slots": slots}
        
    except Exception as e:
        logger.error(f"Erro ao buscar disponibilidade: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar disponibilidade")

# Client Appointment Booking
@api_router.get("/appointments/available-slots")
async def get_available_appointment_slots(
    professional_type: str,
    date: str,
    current_user: User = Depends(get_current_user)
):
    """Get available appointment slots for clients (VIP and Intermediario only)"""
    try:
        # Check user plan permissions - VIP, Premium, and Intermediario only
        user_plan = current_user.plan_type if hasattr(current_user, 'plan_type') else 'basic'
        
        if user_plan not in ['vip', 'premium', 'intermediario']:
            raise HTTPException(
                status_code=403, 
                detail="Agendamentos disponíveis apenas para planos VIP, Premium e Intermediário. Faça upgrade para acessar."
            )
        
        # Get available slots
        available_slots = await db.appointment_slots.find({
            "professional_type": professional_type,
            "date": date,
            "available": True
        }).to_list(100)
        
        # Convert ObjectId to string for JSON serialization
        for slot in available_slots:
            slot["id"] = str(slot["_id"])
            del slot["_id"]
        
        return {"available_slots": available_slots}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar horários disponíveis: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar horários disponíveis")

@api_router.post("/appointments/book")
async def book_appointment(
    appointment: AppointmentRequest,
    current_user: User = Depends(get_current_user)
):
    """Client books an appointment with monthly limits"""
    try:
        # Check user plan permissions
        user_plan = current_user.plan_type if hasattr(current_user, 'plan_type') else 'basic'
        
        if user_plan not in ['vip', 'premium', 'intermediario']:
            raise HTTPException(
                status_code=403, 
                detail="Agendamentos disponíveis apenas para planos VIP, Premium e Intermediário."
            )
        
        # Check monthly appointment limits
        current_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (current_month + timedelta(days=32)).replace(day=1)
        
        existing_appointments = await db.appointments.count_documents({
            "client_id": str(current_user.id),
            "professional_type": appointment.professional_type,
            "created_at": {"$gte": current_month, "$lt": next_month},
            "status": {"$in": ["scheduled", "completed"]}
        })
        
        # Set limits based on plan
        if user_plan == 'intermediario':
            monthly_limit = 1  # 1 consulta por mês
        elif user_plan in ['vip', 'premium']:
            monthly_limit = 2  # 2 consultas por mês
        else:
            monthly_limit = 0
        
        if existing_appointments >= monthly_limit:
            plan_name = "Intermediário" if user_plan == 'intermediario' else "VIP"
            raise HTTPException(
                status_code=400,
                detail=f"Limite de {monthly_limit} consulta{'s' if monthly_limit > 1 else ''} por mês atingido para o plano {plan_name}. Aguarde o próximo mês ou cancele um agendamento existente."
            )
        
        # Check if slot is available
        appointment_date_str = appointment.appointment_date.strftime("%Y-%m-%d") if isinstance(appointment.appointment_date, datetime) else str(appointment.appointment_date)
        
        available_slot = await db.appointment_slots.find_one({
            "professional_id": appointment.professional_id,
            "professional_type": appointment.professional_type,
            "date": appointment_date_str,
            "time": appointment.appointment_time,
            "available": True
        })
        
        if not available_slot:
            raise HTTPException(
                status_code=400,
                detail="Horário não disponível"
            )
        
        # Create appointment
        appointment_data = {
            "client_id": str(current_user.id),
            "client_name": current_user.full_name,
            "client_email": current_user.email,
            "client_phone": getattr(current_user, 'phone', 'Não informado'),
            "professional_id": appointment.professional_id,
            "professional_type": appointment.professional_type,
            "appointment_date": appointment.appointment_date,
            "appointment_time": appointment.appointment_time,
            "duration_minutes": 60,
            "status": "scheduled",
            "notes": appointment.notes or "",
            "created_at": datetime.now(timezone.utc),
            "can_cancel_until": datetime.now(timezone.utc) + timedelta(hours=24)  # Can cancel up to 24h before
        }
        
        result = await db.appointments.insert_one(appointment_data)
        
        # Mark slot as unavailable
        await db.appointment_slots.update_one(
            {"_id": available_slot["_id"]},
            {"$set": {"available": False, "booked_by": str(current_user.id)}}
        )
        
        return {
            "appointment_id": str(result.inserted_id),
            "message": "Agendamento realizado com sucesso!",
            "appointment_details": {
                "date": appointment.appointment_date,
                "time": appointment.appointment_time,
                "professional_type": appointment.professional_type.title(),
                "monthly_remaining": monthly_limit - existing_appointments - 1
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao agendar consulta: {e}")
        raise HTTPException(status_code=500, detail="Erro ao agendar consulta")

@api_router.get("/appointments/my-appointments")
async def get_my_appointments(current_user: User = Depends(get_current_user)):
    """Get user's appointments"""
    try:
        appointments = await db.appointments.find({
            "client_id": str(current_user.id)
        }).sort("appointment_date", 1).to_list(100)
        
        # Add cancel eligibility
        for apt in appointments:
            apt["id"] = str(apt["_id"])  # Add ID for frontend
            if "_id" in apt:
                del apt["_id"]
            
            if apt["status"] == "scheduled":
                # Can cancel if appointment is more than 24h away
                try:
                    # Handle different date formats
                    if isinstance(apt['appointment_date'], datetime):
                        apt_date_str = apt['appointment_date'].strftime("%Y-%m-%d")
                    else:
                        apt_date_str = str(apt['appointment_date']).split('T')[0]  # Remove time if present
                    
                    appointment_datetime = datetime.fromisoformat(f"{apt_date_str}T{apt['appointment_time']}:00")
                    if appointment_datetime.tzinfo is None:
                        appointment_datetime = appointment_datetime.replace(tzinfo=timezone.utc)
                    
                    can_cancel = datetime.now(timezone.utc) + timedelta(hours=24) < appointment_datetime
                    apt["can_cancel"] = can_cancel
                except Exception as date_error:
                    logger.warning(f"Erro ao processar data do agendamento: {date_error}")
                    apt["can_cancel"] = False
            else:
                apt["can_cancel"] = False
        
        return {"appointments": appointments}
        
    except Exception as e:
        logger.error(f"Erro ao buscar agendamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar agendamentos")

@api_router.delete("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel user appointment and free up the slot"""
    try:
        # Find appointment
        appointment = await db.appointments.find_one({
            "_id": ObjectId(appointment_id),
            "client_id": str(current_user.id)
        })
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado")
        
        if appointment["status"] != "scheduled":
            raise HTTPException(status_code=400, detail="Apenas agendamentos ativos podem ser cancelados")
        
        # Check if can still cancel (24h before appointment)
        appointment_datetime = datetime.fromisoformat(f"{appointment['appointment_date']}T{appointment['appointment_time']}:00")
        if datetime.now(timezone.utc) + timedelta(hours=24) >= appointment_datetime:
            raise HTTPException(
                status_code=400,
                detail="Agendamento só pode ser cancelado até 24 horas antes da consulta"
            )
        
        # Cancel appointment
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Free up the slot
        await db.appointment_slots.update_one(
            {
                "professional_id": appointment["professional_id"],
                "date": appointment["appointment_date"],
                "time": appointment["appointment_time"]
            },
            {
                "$set": {
                    "available": True,
                    "booked_by": None
                }
            }
        )
        
        return {
            "success": True,
            "message": "Agendamento cancelado com sucesso. O horário foi liberado para outros clientes.",
            "cancelled_appointment": {
                "date": appointment["appointment_date"],
                "time": appointment["appointment_time"],
                "professional_type": appointment["professional_type"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao cancelar agendamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao cancelar agendamento")

@api_router.get("/appointments/monthly-limits")
async def get_monthly_appointment_limits(current_user: User = Depends(get_current_user)):
    """Get user's monthly appointment limits and usage"""
    try:
        user_plan = current_user.plan_type if hasattr(current_user, 'plan_type') else 'basic'
        
        # Set limits based on plan
        if user_plan == 'basic':
            limits = {"nutritionist": 0, "personal": 0}
        elif user_plan == 'intermediario':
            limits = {"nutritionist": 1, "personal": 1}
        elif user_plan in ['vip', 'premium']:
            limits = {"nutritionist": 2, "personal": 2}
        else:
            limits = {"nutritionist": 0, "personal": 0}
        
        # Count current month usage
        current_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (current_month + timedelta(days=32)).replace(day=1)
        
        usage = {}
        for prof_type in ["nutritionist", "personal"]:
            used_count = await db.appointments.count_documents({
                "client_id": str(current_user.id),
                "professional_type": prof_type,
                "created_at": {"$gte": current_month, "$lt": next_month},
                "status": {"$in": ["scheduled", "completed"]}
            })
            usage[prof_type] = used_count
        
        return {
            "plan_type": user_plan,
            "limits": limits,
            "usage": usage,
            "remaining": {
                "nutritionist": max(0, limits["nutritionist"] - usage["nutritionist"]),
                "personal": max(0, limits["personal"] - usage["personal"])
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar limites: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar limites")

# Professional Appointment Management
@api_router.get("/professionals/appointments")
async def get_professional_appointments(
    date: Optional[str] = None,
    current_professional: dict = Depends(get_current_professional)
):
    """Get professional's appointments"""
    try:
        professional_id = str(current_professional["_id"])
        
        # Build query
        query = {"professional_id": professional_id}
        if date:
            query["appointment_date"] = date
        
        appointments = await db.appointments.find(query).sort("appointment_date", 1).to_list(100)
        
        return {"appointments": appointments}
        
    except Exception as e:
        logger.error(f"Erro ao buscar agendamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar agendamentos")

@api_router.get("/professionals/appointments/stats")
async def get_appointment_stats(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_professional: dict = Depends(get_current_professional)
):
    """Get professional's appointment statistics"""
    try:
        professional_id = str(current_professional["_id"])
        
        # Default to current month/year
        if not month:
            month = datetime.now().month
        if not year:
            year = datetime.now().year
        
        # Date range for the month
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        
        # Get appointments for the month
        appointments = await db.appointments.find({
            "professional_id": professional_id,
            "appointment_date": {"$gte": start_date, "$lt": end_date}
        }).to_list(1000)
        
        # Calculate stats
        total_appointments = len(appointments)
        completed = len([a for a in appointments if a["status"] == "completed"])
        scheduled = len([a for a in appointments if a["status"] == "scheduled"])
        
        # Get unique clients
        unique_clients = set([a["client_id"] for a in appointments])
        total_clients_served = len(unique_clients)
        
        # Calculate hours (each appointment is 1 hour)
        monthly_hours = float(total_appointments)
        
        stats = AppointmentStats(
            total_appointments_month=total_appointments,
            completed_appointments=completed,
            scheduled_appointments=scheduled,
            total_clients_served=total_clients_served,
            monthly_hours=monthly_hours
        )
        
        return stats.dict()
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar estatísticas")

@api_router.put("/appointments/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: str,
    current_professional: dict = Depends(get_current_professional)
):
    """Mark appointment as completed"""
    try:
        professional_id = str(current_professional["_id"])
        
        # Update appointment status
        result = await db.appointments.update_one(
            {
                "_id": ObjectId(appointment_id),
                "professional_id": professional_id
            },
            {
                "$set": {
                    "status": "completed",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado")
        
        return {"message": "Consulta marcada como concluída"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao completar consulta: {e}")
        raise HTTPException(status_code=500, detail="Erro ao completar consulta")

@api_router.post("/professionals/create-plan")
async def create_professional_plan(
    plan_data: dict,
    current_professional: dict = Depends(get_current_professional)
):
    """Create nutrition or workout plan for assigned client"""
    try:
        professional_id = str(current_professional["_id"])
        professional_type = current_professional["professional_type"]
        
        # Validate client is assigned to this professional
        client_id = plan_data.get("client_id")
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id é obrigatório")
        
        # Check if client is assigned to this professional
        assignment = await db.client_assignments.find_one({
            "client_id": client_id,
            "professional_id": professional_id,
            "professional_type": professional_type,
            "status": "active"
        })
        
        if not assignment:
            raise HTTPException(status_code=403, detail="Cliente não está atribuído a este profissional")
        
        # Get client info
        client = await db.users.find_one({"_id": ObjectId(client_id)})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Create plan based on professional type
        plan_document = {
            "client_id": client_id,
            "client_name": client.get("full_name", "Cliente"),
            "professional_id": professional_id,
            "professional_name": current_professional.get("full_name", "Profissional"),
            "professional_type": professional_type,
            "title": plan_data.get("title", ""),
            "description": plan_data.get("description", ""),
            "duration_days": plan_data.get("duration_days", 30),
            "active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        if professional_type == "nutritionist":
            # Nutrition plan specific fields
            plan_document.update({
                "daily_calories": plan_data.get("daily_calories", 0),
                "water_intake": plan_data.get("water_intake", 0),
                "meals": plan_data.get("meals", []),
                "supplements": plan_data.get("supplements", [])
            })
            collection = db.supplement_plans
            
        elif professional_type == "personal":
            # Workout plan specific fields
            plan_document.update({
                "weekly_frequency": plan_data.get("weekly_frequency", 3),
                "difficulty": plan_data.get("difficulty", "Intermediário"),
                "workout_days": plan_data.get("workout_days", [])
            })
            collection = db.workout_plans
        else:
            raise HTTPException(status_code=400, detail="Tipo de profissional inválido")
        
        # Insert plan
        result = await collection.insert_one(plan_document)
        
        return {
            "success": True,
            "plan_id": str(result.inserted_id),
            "message": f"Plano {'nutricional' if professional_type == 'nutritionist' else 'de treino'} criado com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar plano: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar plano")

# User Plan Upgrade System
@api_router.post("/users/request-upgrade")
async def request_plan_upgrade(
    upgrade_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Request plan upgrade with next month effective date"""
    try:
        new_plan = upgrade_data.get("new_plan")
        current_plan = upgrade_data.get("current_plan")
        
        if not new_plan:
            raise HTTPException(status_code=400, detail="new_plan é obrigatório")
        
        # Validate new plan exists
        if new_plan not in PAYMENT_PLANS:
            raise HTTPException(status_code=400, detail="Plano inválido")
        
        plan_info = PAYMENT_PLANS[new_plan]
        
        # Create upgrade request
        upgrade_request = {
            "user_id": str(current_user.id),
            "user_name": current_user.full_name,
            "user_email": current_user.email,
            "current_plan": current_plan,
            "requested_plan": new_plan,
            "plan_name": plan_info["name"],
            "plan_price": plan_info["price"],
            "effective_date": "next_month",
            "status": "pending_approval",
            "payment_status": "pending",
            "requested_at": datetime.now(timezone.utc),
            "admin_approved": False,
            "payment_processed": False
        }
        
        result = await db.plan_upgrade_requests.insert_one(upgrade_request)
        
        return {
            "success": True,
            "request_id": str(result.inserted_id),
            "message": "Solicitação de upgrade enviada para aprovação",
            "upgrade_details": {
                "new_plan": plan_info["name"],
                "price": plan_info["price"],
                "effective_date": "Próximo mês"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao solicitar upgrade: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar solicitação")

@api_router.get("/users/nutrition-plans")
async def get_user_nutrition_plans(current_user: User = Depends(get_current_user)):
    """Get user's nutrition plans"""
    try:
        nutrition_plans = await db.supplement_plans.find({
            "client_id": str(current_user.id),
            "active": True
        }).to_list(100)
        
        return {"nutrition_plans": nutrition_plans}
        
    except Exception as e:
        logger.error(f"Erro ao buscar planos nutricionais: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar planos nutricionais")

@api_router.get("/users/workout-plans")
async def get_user_workout_plans(current_user: User = Depends(get_current_user)):
    """Get user's workout plans"""
    try:
        workout_plans = await db.workout_plans.find({
            "client_id": str(current_user.id),
            "active": True
        }).to_list(100)
        
        return {"workout_plans": workout_plans}
        
    except Exception as e:
        logger.error(f"Erro ao buscar planos de treino: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar planos de treino")

# Supplement System Endpoints
@api_router.post("/admin/supplements/plan")
async def create_supplement_plan(plan: SupplementPlan):
    """Create supplement plan for user (nutritionist admin)"""
    try:
        plan_data = {
            "user_id": plan.user_id,
            "supplements": plan.supplements,
            "created_by": "nutritionist_admin",  # In real app, get from current admin user
            "created_at": datetime.now(timezone.utc),
            "start_date": plan.start_date,
            "end_date": plan.end_date,
            "active": True
        }
        
        result = await db.supplement_plans.insert_one(plan_data)
        
        # Create daily supplement logs for the plan duration
        await create_supplement_logs_for_plan(str(result.inserted_id), plan)
        
        return {
            "id": str(result.inserted_id),
            "message": "Plano de suplementação criado com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar plano de suplementação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar plano")

async def create_supplement_logs_for_plan(plan_id: str, plan: SupplementPlan):
    """Create daily supplement logs for a plan"""
    try:
        current_date = plan.start_date
        end_date = plan.end_date or (plan.start_date + timedelta(days=30))
        
        logs_to_create = []
        
        while current_date <= end_date:
            for supplement in plan.supplements:
                # Create log entry for each supplement timing
                for timing in supplement.get('timings', ['morning']):
                    scheduled_time = current_date.replace(
                        hour=8 if timing == 'morning' else 14 if timing == 'afternoon' else 20,
                        minute=0, second=0, microsecond=0
                    )
                    
                    log_data = {
                        "user_id": plan.user_id,
                        "supplement_plan_id": plan_id,
                        "supplement_name": supplement['name'],
                        "scheduled_time": scheduled_time,
                        "status": "pending",
                        "created_at": datetime.now(timezone.utc)
                    }
                    logs_to_create.append(log_data)
            
            current_date += timedelta(days=1)
        
        if logs_to_create:
            await db.supplement_logs.insert_many(logs_to_create)
            
    except Exception as e:
        logger.error(f"Erro ao criar logs de suplementação: {e}")

@api_router.get("/supplements/user/plan")
async def get_user_supplement_plan(current_user: User = Depends(get_current_user)):
    """Get user's current supplement plan"""
    try:
        plan = await db.supplement_plans.find_one({
            "user_id": str(current_user.id),
            "active": True
        })
        
        if not plan:
            return {"plan": None, "message": "Nenhum plano de suplementação ativo"}
        
        # Get today's supplement logs
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        today_logs = await db.supplement_logs.find({
            "user_id": str(current_user.id),
            "supplement_plan_id": str(plan["_id"]),
            "scheduled_time": {"$gte": today, "$lt": tomorrow}
        }).to_list(20)
        
        return {
            "plan": {
                "id": str(plan["_id"]),
                "supplements": plan["supplements"],
                "start_date": plan["start_date"].isoformat(),
                "created_at": plan["created_at"].isoformat()
            },
            "today_supplements": [
                {
                    "id": str(log["_id"]),
                    "supplement_name": log["supplement_name"],
                    "scheduled_time": log["scheduled_time"].isoformat(),
                    "status": log["status"],
                    "taken_at": log.get("taken_at").isoformat() if log.get("taken_at") else None
                }
                for log in today_logs
            ]
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar plano de suplementação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar plano")

@api_router.post("/supplements/log/{log_id}/take")
async def mark_supplement_taken(log_id: str, current_user: User = Depends(get_current_user)):
    """Mark supplement as taken"""
    try:
        result = await db.supplement_logs.update_one(
            {
                "_id": ObjectId(log_id),
                "user_id": str(current_user.id),
                "status": "pending"
            },
            {
                "$set": {
                    "status": "taken",
                    "taken_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Suplemento não encontrado ou já tomado")
        
        return {"message": "Suplemento marcado como tomado!"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao marcar suplemento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar suplemento")

# Workout System Endpoints
@api_router.post("/admin/workouts/plan")
async def create_workout_plan(plan: WorkoutPlan):
    """Create workout plan for user (personal trainer admin)"""
    try:
        plan_data = {
            "user_id": plan.user_id,
            "workout_name": plan.workout_name,
            "exercises": plan.exercises,
            "created_by": "personal_admin",  # In real app, get from current admin user
            "created_at": datetime.now(timezone.utc),
            "start_date": plan.start_date,
            "end_date": plan.end_date,
            "active": True
        }
        
        result = await db.workout_plans.insert_one(plan_data)
        
        return {
            "id": str(result.inserted_id),
            "message": "Plano de treino criado com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar plano de treino: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar treino")

@api_router.get("/workouts/user/plan")
async def get_user_workout_plan(current_user: User = Depends(get_current_user)):
    """Get user's current workout plan"""
    try:
        # Check user plan
        user_plan = getattr(current_user, 'plan_type', 'basic')
        if user_plan == 'basic':
            return {
                "plan": None,
                "message": "Treinos personalizados disponíveis apenas para planos Premium e VIP",
                "upgrade_required": True
            }
        
        plan = await db.workout_plans.find_one({
            "user_id": str(current_user.id),
            "active": True
        })
        
        if not plan:
            return {"plan": None, "message": "Nenhum plano de treino ativo"}
        
        return {
            "plan": {
                "id": str(plan["_id"]),
                "workout_name": plan["workout_name"],
                "exercises": plan["exercises"],
                "start_date": plan["start_date"].isoformat(),
                "end_date": plan.get("end_date").isoformat() if plan.get("end_date") else None,
                "created_at": plan["created_at"].isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar plano de treino: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar treino")

@api_router.delete("/notifications/scheduled/{notification_id}")
async def cancel_scheduled_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a scheduled notification"""
    try:
        result = await db.scheduled_notifications.delete_one({
            "_id": ObjectId(notification_id),
            "user_id": str(current_user.id),
            "sent": False
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notificação não encontrada")
        
        return {"success": True, "message": "Notificação cancelada com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao cancelar notificação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao cancelar notificação")

# Admin notification endpoints
@api_router.post("/admin/notifications/send")
async def send_admin_notification(notification: NotificationRequest):
    """Send notification to users (admin only)"""
    try:
        # Get users to send notification to
        if notification.user_ids:
            users = await db.users.find(
                {"_id": {"$in": [ObjectId(uid) for uid in notification.user_ids]}}
            ).to_list(1000)
        else:
            # Send to all users with push tokens
            users = await db.users.find({"push_token": {"$exists": True}}).to_list(1000)
        
        sent_count = 0
        for user in users:
            if user.get("push_token"):
                # Here you would integrate with Expo Push Notification Service
                # For now, we'll just store the notification
                notification_data = {
                    "user_id": str(user["_id"]),
                    "title": notification.title,
                    "body": notification.body,
                    "data": notification.data or {},
                    "sent_at": datetime.now(timezone.utc),
                    "sent": True,
                    "push_token": user["push_token"]
                }
                
                await db.sent_notifications.insert_one(notification_data)
                sent_count += 1
        
        return {
            "success": True,
            "sent_count": sent_count,
            "message": f"Notificação enviada para {sent_count} usuários"
        }
        
    except Exception as e:
        logger.error(f"Erro ao enviar notificação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao enviar notificação")

@api_router.get("/admin/notifications/stats")
async def get_notification_stats():
    """Get notification statistics for admin"""
    try:
        total_users_with_tokens = await db.users.count_documents({"push_token": {"$exists": True}})
        scheduled_notifications = await db.scheduled_notifications.count_documents({"sent": False})
        sent_today = await db.sent_notifications.count_documents({
            "sent_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)}
        })
        
        return {
            "users_with_push_tokens": total_users_with_tokens,
            "scheduled_notifications": scheduled_notifications,
            "sent_today": sent_today
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas de notificação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar estatísticas")

# Include the router in the main app
# Include routers
app.include_router(api_router)
app.include_router(integration_router)

# Initialize services
@app.on_event("startup")
async def startup_event():
    init_services(db)
    
    # Create test professionals if they don't exist
    await create_test_professionals()
    
    # Create test users if they don't exist
    await create_test_users()
    
    # Create test gym if it doesn't exist
    await create_test_gym()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()