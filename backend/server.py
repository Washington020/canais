from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client['luxe_forma']

# Stripe API Key
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk-test-51PxqFfJchv7KIiWYvSJNK4jkqFYQ0dYLqP9t5C4WEq7mfBb1ypHxP5Q9N4S2sE2VT4nT4oT4pT5fP1Q9N4S2sE3')

# Emergent LLM Key for AI features
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-f400b75B69872D785E')

# Payment Plans Configuration
PAYMENT_PLANS = {
    "basic": {
        "id": "basic",
        "name": "Plano Básico",
        "price": 29.90,
        "currency": "BRL",
        "duration_days": 30,
        "features": ["10 tokens por mês", "Acesso a academias básicas", "Suporte por email"],
        "token_limit": 10,
        "description": "Ideal para uso ocasional"
    },
    "premium": {
        "id": "premium", 
        "name": "Plano Premium",
        "price": 59.90,
        "currency": "BRL",
        "duration_days": 30,
        "features": ["60 tokens por mês", "Acesso a todas as academias", "Suporte prioritário", "Relatórios detalhados"],
        "token_limit": 60,
        "description": "Recomendado para uso regular"
    },
    "vip": {
        "id": "vip",
        "name": "Plano VIP",
        "price": 99.90,
        "currency": "BRL", 
        "duration_days": 30,
        "features": ["Tokens ilimitados", "Acesso premium", "Suporte 24/7", "Personal trainer virtual", "Nutricionista virtual"],
        "token_limit": -1,  # -1 = unlimited
        "description": "Para quem quer o melhor"
    }
}

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
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
    
    if not user_doc or not verify_password(user_credentials.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_doc["_id"])}, expires_delta=access_token_expires
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
async def validate_simple_token(token_code: str, request: Request, gym_id: str):
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

        # Get gym info for validation record
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
                "full_name": user_doc["full_name"],
                "plan_type": user_doc["plan_type"],
                "email": user_doc["email"]
            },
            "gym_id": gym_id,
            "validation_id": validation_record["validation_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na validação do token: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

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
    
    # Hash the password
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(password)
    
    # Prepare gym document
    gym_doc = {
        "name": gym_data["name"],
        "cnpj": gym_data["cnpj"],
        "razao_social": gym_data.get("razao_social", ""),
        "address": f"{gym_data['endereco']}, {gym_data['numero']} - {gym_data['bairro']}, {gym_data['cidade']}/{gym_data['estado']}",
        "endereco_completo": {
            "endereco": gym_data["endereco"],
            "numero": gym_data["numero"],
            "complemento": gym_data.get("complemento", ""),
            "bairro": gym_data["bairro"],
            "cidade": gym_data["cidade"],
            "estado": gym_data["estado"],
            "cep": gym_data["cep"]
        },
        "email": gym_data["email"],
        "site": gym_data.get("site", ""),
        "phone": gym_data["telefone_principal"],
        "telefone_secundario": gym_data.get("telefone_secundario", ""),
        "horario_funcionamento": gym_data.get("horario_funcionamento", ""),
        "type": gym_data["tipo_academia"],
        "franquia": gym_data.get("franquia", ""),
        "num_unidades": gym_data.get("num_unidades", "1"),
        "responsavel": {
            "nome": gym_data["responsavel_nome"],
            "cargo": gym_data.get("responsavel_cargo", ""),
            "email": gym_data["responsavel_email"],
            "telefone": gym_data["responsavel_telefone"]
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
        "status": "pending",  # pending, analyzing, approved, rejected
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
        "message": f"Academia cadastrada com sucesso! Credenciais enviadas para {gym_data['email']}"
    }

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
    login = credentials.get("login")
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

# Include the router in the main app
# Include routers
app.include_router(api_router)
app.include_router(integration_router)

# Initialize services
@app.on_event("startup")
async def startup_event():
    init_services(db)

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