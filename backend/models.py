from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class PlanType(str, Enum):
    BASICO = "basico"
    INTERMEDIARIO = "intermediario"
    AVANCADO = "avancado"

class PaymentMethod(str, Enum):
    CARTAO_CREDITO = "cartao_credito"
    CARTAO_DEBITO = "cartao_debito"
    PIX = "pix"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"
    PENDING = "pending"

class GymStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

# Token Models
class TokenGenerationRequest(BaseModel):
    token_type: str = Field(default="gym", description="Tipo do token: academia ou nutricionista")
    validity_hours: int = Field(default=4, ge=1, le=24, description="Validade em horas (1-24)")

# User Models
class UserRegistration(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(..., min_length=10, max_length=15)
    plan_type: PlanType
    payment_method: PaymentMethod
    card_token: Optional[str] = None  # Para cartão
    address: Optional[Dict[str, str]] = None

class UserProfile(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    plan_type: PlanType
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    subscription_expires: Optional[datetime] = None

class PlanDetails(BaseModel):
    type: PlanType
    name: str
    description: str
    features: List[str]
    monthly_price: float
    activation_fee: float
    first_month_total: float

# Gym Models
class GymRegistration(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    address: Dict[str, str]  # rua, numero, bairro, cidade, cep
    capacity: int = Field(..., gt=0)
    operating_hours: Dict[str, str]  # seg-sex: "06:00-22:00"
    commission_rate: float = Field(..., gt=0, le=100)  # Porcentagem
    amenities: List[str] = []
    description: Optional[str] = None

class GymProfile(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    address: Dict[str, str]
    capacity: int
    operating_hours: Dict[str, str]
    commission_rate: float
    amenities: List[str]
    description: Optional[str]
    status: GymStatus
    created_at: datetime
    login_credentials: Optional[Dict[str, str]] = None
    stats: Optional[Dict[str, Any]] = None

# Token Models
class TokenGeneration(BaseModel):
    user_id: str
    token_type: str  # 'gym' or 'nutritionist'
    gym_id: Optional[str] = None

class TokenValidation(BaseModel):
    token_code: str
    gym_id: str
    validation_type: str = "checkin"

class CheckinRecord(BaseModel):
    id: str
    user_id: str
    gym_id: str
    token_code: str
    checkin_time: datetime
    status: str  # 'approved', 'denied'
    gym_commission: float
    platform_fee: float

# Payment Models
class PaymentRecord(BaseModel):
    id: str
    user_id: str
    amount: float
    payment_method: PaymentMethod
    status: str  # 'pending', 'completed', 'failed'
    stripe_session_id: Optional[str] = None
    created_at: datetime
    description: str

class Subscription(BaseModel):
    id: str
    user_id: str
    plan_type: PlanType
    status: str  # 'active', 'cancelled', 'expired'
    start_date: datetime
    end_date: datetime
    monthly_amount: float
    next_billing: datetime

# Additional Payment Models
class PaymentPlan(BaseModel):
    id: str
    name: str
    monthly_price: float
    activation_fee: float = 0.0
    first_month_total: float
    currency: str = "BRL"
    duration_days: int
    fidelity_months: int = 12
    features: List[str]
    marketing_benefits: List[str] = []
    nutritionist_consultations: int = 0
    personal_consultations: int = 0
    token_limit: int = 0
    description: str

class PaymentTransaction(BaseModel):
    id: Optional[str] = None
    user_id: str
    plan_id: str
    session_id: str
    payment_id: Optional[str] = None
    amount: float
    currency: str = "BRL"
    payment_status: str = "pending"  # pending, paid, failed, expired
    payment_method: str  # stripe, pagarme
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CreateCheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str
    payment_method: str = "stripe"  # stripe or pagarme

# Notification Models
class PushTokenRequest(BaseModel):
    push_token: str
    device_info: Optional[Dict[str, Any]] = None

class NotificationRequest(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    user_ids: Optional[List[str]] = None  # If None, send to all users

class ScheduledNotification(BaseModel):
    id: Optional[str] = None
    user_id: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    schedule_time: datetime
    sent: bool = False
    created_at: Optional[datetime] = None

# Appointment System Models
class AppointmentRequest(BaseModel):
    professional_type: str  # "nutritionist" or "personal"
    professional_id: Optional[str] = None  # Null for pending appointments (new clients)
    appointment_date: datetime
    appointment_time: str  # "08:00", "09:00", etc.
    notes: Optional[str] = None

class AppointmentSlot(BaseModel):
    id: Optional[str] = None
    professional_id: str
    professional_type: str  # "nutritionist" or "personal"
    date: str  # "2025-01-15"
    time: str  # "08:00"
    available: bool = True
    duration_minutes: int = 60
    created_at: Optional[datetime] = None

class Appointment(BaseModel):
    id: Optional[str] = None
    client_id: str
    client_name: str
    client_email: str
    client_phone: str
    professional_id: str
    professional_type: str  # "nutritionist" or "personal" 
    appointment_date: str  # "2025-01-15"
    appointment_time: str  # "08:00"
    duration_minutes: int = 60
    status: str = "scheduled"  # scheduled, completed, cancelled, rescheduled
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AvailabilitySlot(BaseModel):
    professional_id: str
    professional_type: str
    date: str  # "2025-01-15"
    start_time: str  # "08:00"
    end_time: str  # "19:00"
    break_times: List[str] = []  # ["12:00", "13:00"] for lunch break
    slot_duration: int = 60  # minutes per appointment

class AppointmentStats(BaseModel):
    total_appointments_month: int
    completed_appointments: int
    scheduled_appointments: int
    total_clients_served: int
    monthly_hours: float

# Video Call Models
class VideoCallStartRequest(BaseModel):
    appointment_id: str

# Supplement System Models  
class SupplementPlan(BaseModel):
    id: Optional[str] = None
    user_id: str
    supplements: List[Dict[str, Any]]  # List of supplements with dosage and timing
    created_by: str  # nutritionist admin id
    created_at: Optional[datetime] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    active: bool = True

class SupplementLog(BaseModel):
    id: Optional[str] = None
    user_id: str
    supplement_plan_id: str
    supplement_name: str
    scheduled_time: datetime
    taken_at: Optional[datetime] = None
    status: str = "pending"  # pending, taken, missed
    created_at: Optional[datetime] = None

# Workout System Models
class WorkoutPlan(BaseModel):
    id: Optional[str] = None
    user_id: str
    workout_name: str
    exercises: List[Dict[str, Any]]  # List of exercises with sets, reps, etc
    created_by: str  # personal trainer admin id
    created_at: Optional[datetime] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    active: bool = True

# Professional System Models
class Professional(BaseModel):
    id: Optional[str] = None
    full_name: str
    email: str
    password_hash: str
    professional_type: str  # "nutritionist" or "personal"
    cref_crn: str  # Professional registration number
    specialization: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    experience_years: Optional[int] = None
    pix_key: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None

class ProfessionalLogin(BaseModel):
    email: str
    password: str

class ProfessionalRegister(BaseModel):
    full_name: str
    email: str
    password: str
    professional_type: str  # "nutritionist" or "personal"
    cref_crn: str
    specialization: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    experience_years: Optional[int] = None
    pix_key: Optional[str] = None

# Admin Models
class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_gyms: int
    active_gyms: int
    monthly_revenue: float
    tokens_generated_month: int
    checkins_month: int
    conversion_rate: float

class GymStats(BaseModel):
    gym_id: str
    gym_name: str
    monthly_checkins: int
    monthly_revenue: float
    commission_earned: float
    unique_users: int
    peak_hours: Dict[str, int]
    rating: Optional[float] = None

# System Configuration
class PlatformSettings(BaseModel):
    plans: Dict[str, PlanDetails]
    commission_rates: Dict[str, float]
    payment_settings: Dict[str, Any]
    token_settings: Dict[str, Any]