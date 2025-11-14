from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import HTTPException
import secrets
import bcrypt
from models import *
import uuid
import logging

logger = logging.getLogger(__name__)

class PlanService:
    """Gerencia os planos do LuxePass"""
    
    PLANS = {
        PlanType.BASICO: PlanDetails(
            type=PlanType.BASICO,
            name="Plano Básico",
            description="🎯 **Liberdade Total de Treinar!**\n\n"
                       "✨ Cansou de pagar mensalidade cara e treinar sempre no mesmo lugar? "
                       "Com o Plano Básico você tem acesso a **dezenas de academias** por um preço que cabe no seu bolso!\n\n"
                       "🏋️ **O que você ganha:**\n"
                       "• Acesso ilimitado a todas as academias da rede\n"
                       "• Flexibilidade total: treina onde e quando quiser\n"
                       "• Economiza até 50% comparado às mensalidades tradicionais\n"
                       "• Sem fidelidade: cancele quando quiser\n\n"
                       "💪 **Perfeito para você que:**\n"
                       "• Quer economizar sem abrir mão da qualidade\n"
                       "• Gosta de variar o local de treino\n"
                       "• Busca praticidade e flexibilidade\n\n"
                       "🚀 **Comece hoje mesmo sua jornada fitness!**",
            features=[
                "Acesso a todas as academias da rede LuxePass",
                "Treinos ilimitados",
                "App exclusivo para gerar tokens",
                "Flexibilidade total de horários",
                "Suporte 24/7",
                "Sem taxa de cancelamento"
            ],
            monthly_price=99.90,
            activation_fee=29.90,
            first_month_total=129.80
        ),
        
        PlanType.INTERMEDIARIO: PlanDetails(
            type=PlanType.INTERMEDIARIO,
            name="Plano Intermediário",
            description="🔥 **O Plano Mais Completo e Vantajoso!**\n\n"
                       "🎖️ **BEST SELLER** - O favorito dos nossos clientes!\n\n"
                       "💎 Imagine ter acesso a academias + acompanhamento nutricional profissional "
                       "por menos do que você pagaria só pela consulta com nutricionista!\n\n"
                       "🏆 **Seus benefícios exclusivos:**\n"
                       "• Todas as academias da rede liberadas\n"
                       "• **1 consulta mensal com nutricionista** (vale R$ 200+)\n"
                       "• Plano alimentar personalizado\n"
                       "• Treinos básicos no app\n"
                       "• Acompanhamento nutricional contínuo\n\n"
                       "📊 **Resultado garantido:**\n"
                       "• Treino + Nutrição = Fórmula do sucesso\n"
                       "• Economize R$ 150+ por mês em consultas\n"
                       "• Resultados 3x mais rápidos\n\n"
                       "🎯 **Investimento que se paga sozinho!**",
            features=[
                "Tudo do Plano Básico +",
                "1 consulta mensal com nutricionista certificado",
                "Plano alimentar personalizado",
                "Treinos básicos no app",
                "Acompanhamento nutricional contínuo",
                "Chat direto com nutricionista",
                "Relatórios de progresso",
                "Prioridade no agendamento"
            ],
            monthly_price=159.90,
            activation_fee=59.90,
            first_month_total=219.80
        ),
        
        PlanType.AVANCADO: PlanDetails(
            type=PlanType.AVANCADO,
            name="Plano Avançado",
            description="👑 **VIP Experience - O Máximo em Fitness!**\n\n"
                       "🌟 **EXCLUSIVO** - Para quem não aceita menos que o melhor!\n\n"
                       "💯 O Plano Avançado é seu passaporte para o mundo fitness premium. "
                       "Academias de alto padrão + acompanhamento profissional completo!\n\n"
                       "🏅 **Experiência Premium:**\n"
                       "• Academias de alto padrão e boutique\n"
                       "• **2 consultas mensais com nutricionista**\n"
                       "• Personal trainer online dedicado\n"
                       "• Treinos personalizados profissionais\n"
                       "• Consultoria fitness completa\n\n"
                       "🚀 **Resultados Extraordinários:**\n"
                       "• Acompanhamento profissional 360°\n"
                       "• Acesso às melhores academias da cidade\n"
                       "• Consultoria nutricional premium\n"
                       "• Personal trainer online exclusivo\n\n"
                       "💎 **Para quem quer o melhor dos melhores!**",
            features=[
                "Acesso a TODAS as academias (incluindo premium)",
                "2 consultas mensais com nutricionista",
                "Personal trainer online dedicado",
                "2 consultas mensais de acompanhamento online",
                "Treinos profissionais personalizados",
                "Plano nutricional premium",
                "Suporte prioritário 24/7",
                "Acesso a academias boutique",
                "Relatórios detalhados de progresso",
                "Chat exclusivo com profissionais"
            ],
            monthly_price=349.90,
            activation_fee=0.00,
            first_month_total=349.90
        )
    }
    
    @classmethod
    def get_plan(cls, plan_type: PlanType) -> PlanDetails:
        return cls.PLANS[plan_type]
    
    @classmethod
    def get_all_plans(cls) -> List[PlanDetails]:
        return list(cls.PLANS.values())
    
    @classmethod
    def calculate_first_payment(cls, plan_type: PlanType) -> float:
        plan = cls.get_plan(plan_type)
        return plan.activation_fee + plan.monthly_price

class UserService:
    def __init__(self, db):
        self.db = db
        self.users_collection = db['users']
        self.subscriptions_collection = db['subscriptions']
        self.payments_collection = db['payments']
    
    async def register_user(self, user_data: UserRegistration) -> Dict[str, Any]:
        """Registra novo usuário com assinatura e pagamento"""
        
        # Verificar se email já existe
        existing_user = await self.users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Gerar ID único
        user_id = str(uuid.uuid4())
        
        # Hash da senha
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
        
        # Calcular valores do plano
        plan = PlanService.get_plan(user_data.plan_type)
        first_payment_amount = PlanService.calculate_first_payment(user_data.plan_type)
        
        # Criar usuário
        user_doc = {
            "id": user_id,
            "full_name": user_data.full_name,
            "email": user_data.email,
            "phone": user_data.phone,
            "password_hash": hashed_password.decode('utf-8'),
            "plan_type": user_data.plan_type.value,
            "status": UserStatus.PENDING.value,  # Pending até confirmar pagamento
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "address": user_data.address or {}
        }
        
        # Inserir usuário
        await self.users_collection.insert_one(user_doc)
        
        # Criar assinatura
        subscription_id = str(uuid.uuid4())
        subscription_doc = {
            "id": subscription_id,
            "user_id": user_id,
            "plan_type": user_data.plan_type.value,
            "status": "pending",
            "start_date": datetime.utcnow(),
            "end_date": datetime.utcnow() + timedelta(days=30),
            "monthly_amount": plan.monthly_price,
            "next_billing": datetime.utcnow() + timedelta(days=30),
            "created_at": datetime.utcnow()
        }
        
        await self.subscriptions_collection.insert_one(subscription_doc)
        
        # Criar registro de pagamento
        payment_id = str(uuid.uuid4())
        payment_doc = {
            "id": payment_id,
            "user_id": user_id,
            "subscription_id": subscription_id,
            "amount": first_payment_amount,
            "payment_method": user_data.payment_method.value,
            "status": "pending",
            "description": f"Taxa de adesão + 1ª mensalidade - {plan.name}",
            "created_at": datetime.utcnow(),
            "card_token": user_data.card_token
        }
        
        await self.payments_collection.insert_one(payment_doc)
        
        return {
            "user_id": user_id,
            "subscription_id": subscription_id,
            "payment_id": payment_id,
            "amount": first_payment_amount,
            "plan": plan.dict(),
            "message": "Usuário registrado com sucesso! Finalize o pagamento para ativar sua conta."
        }
    
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Busca perfil completo do usuário"""
        user = await self.users_collection.find_one({"id": user_id})
        if not user:
            return None
        
        subscription = await self.subscriptions_collection.find_one({
            "user_id": user_id,
            "status": {"$in": ["active", "pending"]}
        })
        
        return UserProfile(
            id=user["id"],
            full_name=user["full_name"],
            email=user["email"],
            phone=user["phone"],
            plan_type=PlanType(user["plan_type"]),
            status=UserStatus(user["status"]),
            created_at=user["created_at"],
            updated_at=user["updated_at"],
            subscription_expires=subscription["end_date"] if subscription else None
        )

class GymService:
    def __init__(self, db):
        self.db = db
        self.gyms_collection = db['gyms']
        self.checkins_collection = db['checkins']
        self.tokens_collection = db['tokens']
    
    async def register_gym(self, gym_data: GymRegistration, admin_id: str) -> Dict[str, Any]:
        """Registra nova academia pelo admin"""
        
        # Verificar se email já existe
        existing_gym = await self.gyms_collection.find_one({"email": gym_data.email})
        if existing_gym:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Gerar credenciais de acesso
        gym_id = str(uuid.uuid4())
        username = f"gym_{secrets.token_hex(4)}"
        password = secrets.token_urlsafe(12)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Criar documento da academia
        gym_doc = {
            "id": gym_id,
            "name": gym_data.name,
            "email": gym_data.email,
            "phone": gym_data.phone,
            "address": gym_data.address,
            "capacity": gym_data.capacity,
            "operating_hours": gym_data.operating_hours,
            "commission_rate": gym_data.commission_rate,
            "amenities": gym_data.amenities,
            "description": gym_data.description,
            "status": GymStatus.PENDING.value,
            "created_at": datetime.utcnow(),
            "created_by": admin_id,
            "login_credentials": {
                "username": username,
                "password_hash": password_hash.decode('utf-8')
            },
            "stats": {
                "total_checkins": 0,
                "monthly_checkins": 0,
                "total_revenue": 0.0,
                "monthly_revenue": 0.0,
                "unique_users": 0
            }
        }
        
        await self.gyms_collection.insert_one(gym_doc)
        
        # Criar usuário de login para a academia na tabela gym_users
        gym_user_doc = {
            "gym_id": gym_id,
            "email": gym_data.email,
            "password_hash": password_hash.decode('utf-8'),
            "username": username,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        await self.db.gym_users.insert_one(gym_user_doc)
        
        return {
            "gym_id": gym_id,
            "name": gym_data.name,
            "login_credentials": {
                "username": username,
                "password": password  # Retorna senha em texto claro APENAS na criação
            },
            "message": "Academia cadastrada com sucesso! Guarde as credenciais de acesso."
        }
    
    async def validate_token(self, token_code: str, gym_id: str) -> Dict[str, Any]:
        """Valida token na academia e registra check-in"""
        
        # Buscar token
        token = await self.tokens_collection.find_one({
            "token_code": token_code,
            "status": "active"
        })
        
        if not token:
            return {"valid": False, "message": "Token não encontrado ou inválido"}
        
        # Verificar expiração
        if datetime.utcnow() > token["expires_at"]:
            await self.tokens_collection.update_one(
                {"token_code": token_code},
                {"$set": {"status": "expired"}}
            )
            return {"valid": False, "message": "Token expirado"}
        
        # Verificar se já foi usado (se single_use)
        if token.get("single_use", False) and token.get("used", False):
            return {"valid": False, "message": "Token já foi utilizado"}
        
        # Buscar informações da academia
        gym = await self.gyms_collection.find_one({"id": gym_id})
        if not gym:
            return {"valid": False, "message": "Academia não encontrada"}
        
        # Calcular comissões
        commission_amount = 5.00  # Valor fixo por check-in
        gym_commission = commission_amount * (gym["commission_rate"] / 100)
        platform_fee = commission_amount - gym_commission
        
        # Registrar check-in
        checkin_id = str(uuid.uuid4())
        checkin_doc = {
            "id": checkin_id,
            "user_id": token["user_id"],
            "gym_id": gym_id,
            "token_code": token_code,
            "checkin_time": datetime.utcnow(),
            "status": "approved",
            "gym_commission": gym_commission,
            "platform_fee": platform_fee,
            "created_at": datetime.utcnow()
        }
        
        await self.checkins_collection.insert_one(checkin_doc)
        
        # Marcar token como usado
        await self.tokens_collection.update_one(
            {"token_code": token_code},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        
        # Atualizar estatísticas da academia
        await self.gyms_collection.update_one(
            {"id": gym_id},
            {
                "$inc": {
                    "stats.total_checkins": 1,
                    "stats.monthly_checkins": 1,
                    "stats.total_revenue": gym_commission,
                    "stats.monthly_revenue": gym_commission
                }
            }
        )
        
        return {
            "valid": True,
            "message": "Check-in aprovado com sucesso!",
            "checkin_id": checkin_id,
            "user_id": token["user_id"],
            "gym_commission": gym_commission,
            "timestamp": datetime.utcnow()
        }

class AdminService:
    def __init__(self, db):
        self.db = db
        self.users_collection = db['users']
        self.gyms_collection = db['gyms']
        self.checkins_collection = db['checkins']
        self.tokens_collection = db['tokens']
        self.payments_collection = db['payments']
        self.subscriptions_collection = db['subscriptions']
    
    async def get_dashboard_stats(self) -> AdminStats:
        """Busca estatísticas para dashboard do admin"""
        
        # Contar usuários
        total_users = await self.users_collection.count_documents({})
        active_users = await self.users_collection.count_documents({"status": "active"})
        
        # Contar academias
        total_gyms = await self.gyms_collection.count_documents({})
        active_gyms = await self.gyms_collection.count_documents({"status": "active"})
        
        # Revenue mensal
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_payments = self.payments_collection.aggregate([
            {"$match": {"created_at": {"$gte": start_of_month}, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ])
        
        monthly_revenue = 0.0
        async for payment in monthly_payments:
            monthly_revenue = payment["total"]
        
        # Tokens gerados no mês
        tokens_month = await self.tokens_collection.count_documents({
            "created_at": {"$gte": start_of_month}
        })
        
        # Check-ins do mês
        checkins_month = await self.checkins_collection.count_documents({
            "checkin_time": {"$gte": start_of_month}
        })
        
        # Taxa de conversão (usuários ativos / total)
        conversion_rate = (active_users / total_users * 100) if total_users > 0 else 0
        
        return AdminStats(
            total_users=total_users,
            active_users=active_users,
            total_gyms=total_gyms,
            active_gyms=active_gyms,
            monthly_revenue=monthly_revenue,
            tokens_generated_month=tokens_month,
            checkins_month=checkins_month,
            conversion_rate=conversion_rate
        )
    
    async def get_gym_stats(self, gym_id: Optional[str] = None) -> List[GymStats]:
        """Busca estatísticas das academias"""
        
        match_filter = {}
        if gym_id:
            match_filter["id"] = gym_id
        
        # Buscar academias com estatísticas
        gyms = []
        async for gym in self.gyms_collection.find(match_filter):
            # Estatísticas do mês atual
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            monthly_checkins = await self.checkins_collection.count_documents({
                "gym_id": gym["id"],
                "checkin_time": {"$gte": start_of_month}
            })
            
            # Revenue mensal da academia
            monthly_revenue_pipeline = self.checkins_collection.aggregate([
                {"$match": {
                    "gym_id": gym["id"],
                    "checkin_time": {"$gte": start_of_month}
                }},
                {"$group": {"_id": None, "total": {"$sum": "$gym_commission"}}}
            ])
            
            monthly_revenue = 0.0
            async for result in monthly_revenue_pipeline:
                monthly_revenue = result["total"]
            
            # Usuários únicos
            unique_users_pipeline = self.checkins_collection.aggregate([
                {"$match": {"gym_id": gym["id"]}},
                {"$group": {"_id": "$user_id"}},
                {"$count": "unique_users"}
            ])
            
            unique_users = 0
            async for result in unique_users_pipeline:
                unique_users = result["unique_users"]
            
            gyms.append(GymStats(
                gym_id=gym["id"],
                gym_name=gym["name"],
                monthly_checkins=monthly_checkins,
                monthly_revenue=monthly_revenue,
                commission_earned=monthly_revenue,
                unique_users=unique_users,
                peak_hours={"06:00": 10, "18:00": 15},  # Mock data
                rating=4.5  # Mock data
            ))
        
        return gyms