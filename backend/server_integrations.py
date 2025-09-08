from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import *
from services import *
from token_system import token_manager
import jwt
from datetime import datetime
import logging
import secrets

logger = logging.getLogger(__name__)

# Configurações
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"

# Inicializar serviços
user_service = None
gym_service = None  
admin_service = None

def init_services(db):
    global user_service, gym_service, admin_service
    user_service = UserService(db)
    gym_service = GymService(db)
    admin_service = AdminService(db)

# Router para novas integrações
integration_router = APIRouter(prefix="/api/integration")

# Dependency para verificar token
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ========================
# ENDPOINTS DO CLIENTE
# ========================

@integration_router.post("/user/register", response_model=Dict[str, Any])
async def register_new_user(user_data: UserRegistration):
    """Registra novo usuário com plano e pagamento"""
    try:
        result = await user_service.register_user(user_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no registro de usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@integration_router.get("/plans", response_model=List[PlanDetails])
async def get_available_plans():
    """Retorna todos os planos disponíveis"""
    return PlanService.get_all_plans()

@integration_router.get("/plans/{plan_type}", response_model=PlanDetails)
async def get_plan_details(plan_type: PlanType):
    """Retorna detalhes de um plano específico"""
    return PlanService.get_plan(plan_type)

@integration_router.get("/user/profile", response_model=UserProfile)
async def get_user_profile(current_user: str = Depends(get_current_user)):
    """Busca perfil completo do usuário"""
    profile = await user_service.get_user_profile(current_user)
    if not profile:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return profile

@integration_router.post("/user/generate-token")
async def generate_user_token(
    token_request: TokenGeneration,
    current_user: str = Depends(get_current_user)
):
    """Gera token para academia ou nutricionista"""
    try:
        # Verificar se o usuário está ativo
        profile = await user_service.get_user_profile(current_user)
        if not profile or profile.status != UserStatus.ACTIVE:
            raise HTTPException(status_code=403, detail="Usuário não ativo")
        
        # Gerar token usando o sistema existente
        token_data = token_manager.generate_advanced_token(
            user_id=current_user,
            token_type=token_request.token_type,
            gym_id=token_request.gym_id,
            validity_hours=4,
            single_use=True
        )
        
        return {
            "success": True,
            "token_code": token_data.token_code,
            "token_type": token_data.token_type,
            "expires_at": token_data.expires_at.isoformat(),
            "message": f"Token {token_request.token_type} gerado com sucesso!"
        }
    except Exception as e:
        logger.error(f"Erro na geração de token: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar token")

# ========================
# ENDPOINTS DA ACADEMIA
# ========================

@integration_router.post("/gym/validate-token")
async def validate_gym_token(validation: TokenValidation):
    """Valida token na academia e registra check-in"""
    try:
        result = await gym_service.validate_token(
            validation.token_code, 
            validation.gym_id
        )
        return result
    except Exception as e:
        logger.error(f"Erro na validação de token: {e}")
        raise HTTPException(status_code=500, detail="Erro ao validar token")

@integration_router.get("/gym/{gym_id}/stats")
async def get_gym_statistics(gym_id: str):
    """Busca estatísticas específicas da academia"""
    try:
        stats = await admin_service.get_gym_stats(gym_id)
        if not stats:
            raise HTTPException(status_code=404, detail="Academia não encontrada")
        return stats[0]
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas da academia: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

@integration_router.get("/gym/{gym_id}/checkins")
async def get_gym_checkins(gym_id: str, limit: int = 50):
    """Busca histórico de check-ins da academia"""
    try:
        checkins = await gym_service.db.checkins_collection.find(
            {"gym_id": gym_id}
        ).sort("checkin_time", -1).limit(limit).to_list(length=limit)
        
        return {"checkins": checkins}
    except Exception as e:
        logger.error(f"Erro ao buscar check-ins: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

# ========================
# ENDPOINTS DO ADMIN
# ========================

@integration_router.post("/admin/gym/register")
async def admin_register_gym(
    gym_data: GymRegistration,
    current_user: str = Depends(get_current_user)
):
    """Admin registra nova academia"""
    try:
        result = await gym_service.register_gym(gym_data, current_user)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no registro de academia: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

@integration_router.get("/admin/dashboard", response_model=AdminStats)
async def get_admin_dashboard(current_user: str = Depends(get_current_user)):
    """Dashboard completo do admin"""
    try:
        stats = await admin_service.get_dashboard_stats()
        return stats
    except Exception as e:
        logger.error(f"Erro no dashboard admin: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

@integration_router.get("/admin/users")
async def get_all_users(
    current_user: str = Depends(get_current_user),
    limit: int = 100,
    offset: int = 0
):
    """Lista todos os usuários para o admin"""
    try:
        users = await admin_service.users_collection.find().skip(offset).limit(limit).to_list(length=limit)
        
        # Buscar dados das assinaturas para cada usuário
        enriched_users = []
        for user in users:
            # Usar _id se id não existir
            user_id = user.get('id', str(user.get('_id')))
            
            subscription = await admin_service.subscriptions_collection.find_one({
                "user_id": user_id,
                "status": {"$in": ["active", "pending"]}
            })
            
            user_data = {
                "id": user_id,
                "full_name": user.get("full_name", "Nome não informado"),
                "email": user.get("email", "Email não informado"),
                "phone": user.get("phone", ""),
                "plan_type": user.get("plan_type", "basico"),
                "status": user.get("status", "active"),
                "created_at": user.get("created_at", "2024-01-01T00:00:00"),
                "subscription": subscription or {
                    "monthly_amount": 59.90,
                    "status": "active"
                }
            }
            enriched_users.append(user_data)
        
        return {"users": enriched_users}
    except Exception as e:
        logger.error(f"Erro ao buscar usuários: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

@integration_router.get("/admin/gyms")
async def get_all_gyms(current_user: str = Depends(get_current_user)):
    """Lista todas as academias para o admin"""
    try:
        if admin_service is None:
            raise HTTPException(status_code=500, detail="Serviços não inicializados")
        
        gyms = await admin_service.gyms_collection.find().to_list(length=None)
        return {"gyms": gyms}
    except Exception as e:
        logger.error(f"Erro ao buscar academias: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@integration_router.get("/admin/tokens")
async def get_all_tokens(
    current_user: str = Depends(get_current_user),
    limit: int = 100
):
    """Lista todos os tokens gerados"""
    try:
        tokens = await admin_service.tokens_collection.find().sort(
            "created_at", -1
        ).limit(limit).to_list(length=limit)
        
        return {"tokens": tokens}
    except Exception as e:
        logger.error(f"Erro ao buscar tokens: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

@integration_router.get("/admin/checkins")
async def get_all_checkins(
    current_user: str = Depends(get_current_user),
    limit: int = 100
):
    """Lista todos os check-ins"""
    try:
        checkins = await admin_service.checkins_collection.find().sort(
            "checkin_time", -1
        ).limit(limit).to_list(length=limit)
        
        return {"checkins": checkins}
    except Exception as e:
        logger.error(f"Erro ao buscar check-ins: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

@integration_router.get("/admin/revenue")
async def get_revenue_stats(current_user: str = Depends(get_current_user)):
    """Estatísticas detalhadas de faturamento"""
    try:
        # Faturamento por check-ins
        checkin_revenue = admin_service.checkins_collection.aggregate([
            {"$group": {
                "_id": None,
                "total_checkins": {"$sum": 1},
                "total_gym_commission": {"$sum": "$gym_commission"},
                "total_platform_fee": {"$sum": "$platform_fee"}
            }}
        ])
        
        checkin_stats = {"total_checkins": 0, "total_gym_commission": 0, "total_platform_fee": 0}
        async for stat in checkin_revenue:
            checkin_stats = stat
        
        # Faturamento por assinaturas
        subscription_revenue = admin_service.payments_collection.aggregate([
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": None,
                "total_subscription_revenue": {"$sum": "$amount"},
                "total_payments": {"$sum": 1}
            }}
        ])
        
        subscription_stats = {"total_subscription_revenue": 0, "total_payments": 0}
        async for stat in subscription_revenue:
            subscription_stats = stat
        
        # Faturamento por academia
        gym_revenue = admin_service.checkins_collection.aggregate([
            {"$group": {
                "_id": "$gym_id",
                "checkins": {"$sum": 1},
                "gym_commission": {"$sum": "$gym_commission"},
                "platform_fee": {"$sum": "$platform_fee"}
            }}
        ])
        
        gym_stats = []
        async for stat in gym_revenue:
            # Buscar nome da academia
            gym = await admin_service.gyms_collection.find_one({"id": stat["_id"]})
            gym_name = gym["name"] if gym else "Academia não encontrada"
            
            gym_stats.append({
                "gym_id": stat["_id"],
                "gym_name": gym_name,
                "checkins": stat["checkins"],
                "gym_commission": stat["gym_commission"],
                "platform_fee": stat["platform_fee"]
            })
        
        return {
            "checkin_stats": checkin_stats,
            "subscription_stats": subscription_stats,
            "gym_breakdown": gym_stats,
            "total_revenue": checkin_stats["total_platform_fee"] + subscription_stats["total_subscription_revenue"]
        }
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas de faturamento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

@integration_router.put("/gym/{gym_id}/status")
async def update_gym_status(
    gym_id: str,
    status: GymStatus,
    current_user: str = Depends(get_current_user)
):
    """Admin atualiza status da academia"""
    try:
        result = await admin_service.gyms_collection.update_one(
            {"id": gym_id},
            {"$set": {"status": status.value, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Academia não encontrada")
        
        return {"message": f"Status da academia atualizado para {status.value}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar status da academia: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

# ========================
# ENDPOINTS DE PAGAMENTO
# ========================

@integration_router.post("/payment/create-session")
async def create_payment_session(
    payment_data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """Cria sessão de pagamento Stripe"""
    try:
        # Integração com Stripe/Pagar.me aqui
        # Por enquanto retorna mock
        return {
            "session_id": f"sess_{secrets.token_hex(16)}",
            "payment_url": "https://checkout.stripe.com/mock",
            "status": "created"
        }
    except Exception as e:
        logger.error(f"Erro ao criar sessão de pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")

@integration_router.post("/payment/confirm")
async def confirm_payment(
    payment_id: str,
    session_id: str,
    current_user: str = Depends(get_current_user)
):
    """Confirma pagamento e ativa usuário"""
    try:
        # Atualizar status do pagamento
        await admin_service.payments_collection.update_one(
            {"id": payment_id},
            {"$set": {"status": "completed", "stripe_session_id": session_id}}
        )
        
        # Ativar usuário
        await admin_service.users_collection.update_one(
            {"id": current_user},
            {"$set": {"status": UserStatus.ACTIVE.value}}
        )
        
        # Ativar assinatura
        await admin_service.subscriptions_collection.update_one(
            {"user_id": current_user, "status": "pending"},
            {"$set": {"status": "active"}}
        )
        
        return {"message": "Pagamento confirmado e conta ativada!"}
    except Exception as e:
        logger.error(f"Erro ao confirmar pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")