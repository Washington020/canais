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
from token_system import token_manager, AdvancedToken, TokenAuditLog

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client['fitpass_brasil']

# Stripe API Key
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk-test-51PxqFfJchv7KIiWYvSJNK4jkqFYQ0dYLqP9t5C4WEq7mfBb1ypHxP5Q9N4S2sE2VT4nT4oT4pT5fP1Q9N4S2sE3')

# Emergent LLM Key for AI features
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-f400b75B69872D785E')

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app
app = FastAPI(title="FitPass Brasil API", version="1.0.0")

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
    if not user_doc and user_credentials.email == "admin@fitpass.com":
        admin_user = {
            "email": "admin@fitpass.com",
            "full_name": "Administrador FitPass",
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
async def validate_token(token_code: str, request: Request, gym_id: str):
    # Get client information for audit
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    device_info = request.headers.get("user-agent", "unknown")
    
    # Find token in database
    token_doc = await db.token_usage.find_one({"token_code": token_code})
    
    if not token_doc:
        # Log failed validation attempt
        audit_log = token_manager.create_audit_log(
            action="validation_failed",
            token_id="unknown",
            user_id="unknown",
            gym_id=gym_id,
            success=False,
            failure_reason="Token não encontrado",
            device_info=device_info,
            ip_address=client_ip
        )
        await db.token_audit_logs.insert_one(audit_log.dict())
        
        raise HTTPException(status_code=404, detail="Token não encontrado")
    
    # Convert database document to AdvancedToken object
    try:
        # Reconstruct AdvancedToken from database document
        from token_system import TokenLimits, TokenSecurity
        
        usage_limits = TokenLimits(**token_doc["usage_limits"])
        security = TokenSecurity(**token_doc["security"])
        
        advanced_token = AdvancedToken(
            token_id=token_doc["token_id"],
            token_code=token_doc["token_code"],
            hash_unique=token_doc["hash_unique"],
            gym_id=token_doc["gym_id"],
            user_id=str(token_doc["user_id"]),
            issued_at=token_doc["issued_at"],
            expires_at=token_doc["expires_at"],
            status=token_doc["status"],
            access_type=token_doc["access_type"],
            usage_limits=usage_limits,
            security=security,
            metadata=token_doc["metadata"],
            created_by=str(token_doc["user_id"]),
            last_validated_at=token_doc.get("last_validated_at"),
            validation_count=token_doc.get("validation_count", 0)
        )
        
        # Validate token security
        validation_result = token_manager.validate_token_security(advanced_token)
        
        if not validation_result["valid"]:
            # Log failed validation
            audit_log = token_manager.create_audit_log(
                action="validation_failed",
                token_id=advanced_token.token_id,
                user_id=advanced_token.user_id,
                gym_id=gym_id,
                success=False,
                failure_reason="; ".join(validation_result["errors"]),
                device_info=device_info,
                ip_address=client_ip
            )
            await db.token_audit_logs.insert_one(audit_log.dict())
            
            error_message = "Token inválido: " + "; ".join(validation_result["errors"])
            raise HTTPException(status_code=400, detail=error_message)
        
        # Update usage statistics
        advanced_token = token_manager.update_usage_statistics(advanced_token)
        
        # Update token in database
        await db.token_usage.update_one(
            {"token_code": token_code},
            {
                "$set": {
                    "is_used": True,
                    "used_at": datetime.now(timezone.utc),
                    "gym_id": gym_id,
                    "last_validated_at": advanced_token.last_validated_at,
                    "validation_count": advanced_token.validation_count,
                    "usage_limits": advanced_token.usage_limits.dict(),
                    "status": "used"
                }
            }
        )
        
        # Update user statistics
        await db.users.update_one(
            {"_id": ObjectId(advanced_token.user_id)},
            {
                "$inc": {
                    "tokens_used": 1,
                    "gyms_visited": 1 if token_doc["token_type"] == "gym" else 0
                }
            }
        )
        
        # Get user info for response
        user_doc = await db.users.find_one({"_id": ObjectId(advanced_token.user_id)})
        
        # Log successful validation
        audit_log = token_manager.create_audit_log(
            action="validated",
            token_id=advanced_token.token_id,
            user_id=advanced_token.user_id,
            gym_id=gym_id,
            success=True,
            device_info=device_info,
            ip_address=client_ip
        )
        await db.token_audit_logs.insert_one(audit_log.dict())
        
        return {
            "valid": True,
            "token_info": {
                "token_id": advanced_token.token_id,
                "token_code": advanced_token.token_code,
                "access_type": advanced_token.access_type,
                "validation_count": advanced_token.validation_count,
                "security_score": validation_result["security_score"],
                "usage_limits": advanced_token.usage_limits.dict()
            },
            "user": {
                "full_name": user_doc["full_name"],
                "plan_type": user_doc["plan_type"],
                "email": user_doc["email"]
            },
            "validation": {
                "validated_at": datetime.now(timezone.utc),
                "gym_id": gym_id,
                "client_ip": client_ip,
                "security_warnings": validation_result.get("warnings", [])
            }
        }
        
    except Exception as e:
        # Log system error
        audit_log = token_manager.create_audit_log(
            action="validation_error",
            token_id=token_doc.get("token_id", "unknown"),
            user_id=str(token_doc.get("user_id", "unknown")),
            gym_id=gym_id,
            success=False,
            failure_reason=f"Erro do sistema: {str(e)}",
            device_info=device_info,
            ip_address=client_ip
        )
        await db.token_audit_logs.insert_one(audit_log.dict())
        
        raise HTTPException(status_code=500, detail="Erro interno do sistema na validação")

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
    
    # Generate unique login and password
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
        "login": login,
        "hashed_password": hashed_password,
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
    
    # Update gym password
    result = await db.gyms.update_one(
        {"_id": ObjectId(gym_id)},
        {
            "$set": {
                "hashed_password": hashed_password,
                "password_reset_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Academia não encontrada")
    
    # Get gym info for email
    gym = await db.gyms.find_one({"_id": ObjectId(gym_id)})
    
    return {
        "success": True,
        "new_password": new_password,
        "login": gym["login"],
        "message": f"Nova senha gerada para {gym['name']}"
    }

# Gym authentication endpoint for validation system
@api_router.post("/gym/auth")
async def gym_authenticate(credentials: dict):
    login = credentials.get("login")
    password = credentials.get("password")
    
    if not login or not password:
        raise HTTPException(status_code=400, detail="Login e senha são obrigatórios")
    
    # Find gym by login
    gym = await db.gyms.find_one({"login": login})
    
    if not gym:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verify password
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    if not pwd_context.verify(password, gym["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if gym["status"] != "approved":
        raise HTTPException(status_code=403, detail="Academia não aprovada para uso")
    
    # Generate token for gym session
    gym_token = create_access_token(data={"sub": str(gym["_id"]), "type": "gym"})
    
    return {
        "access_token": gym_token,
        "token_type": "bearer",
        "gym_info": {
            "id": str(gym["_id"]),
            "name": gym["name"],
            "type": gym["type"],
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
app.include_router(api_router)

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