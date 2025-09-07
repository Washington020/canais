"""
Sistema Avançado de Tokens FitPass Brasil
Implementa todas as funcionalidades de segurança, auditoria e validação
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import jwt
import json
from cryptography.fernet import Fernet
import base64

class TokenLimits(BaseModel):
    daily_limit: int = 3
    monthly_limit: int = 60
    current_daily_usage: int = 0
    current_monthly_usage: int = 0

class TokenSecurity(BaseModel):
    hash: str
    signature: str
    nonce: str
    encrypted_data: Optional[str] = None

class TokenAuditLog(BaseModel):
    timestamp: datetime
    action: str  # 'generated', 'validated', 'revoked', 'expired'
    user_id: str
    gym_id: Optional[str] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    token_id: str

class AdvancedToken(BaseModel):
    # Identificação
    token_id: str
    token_code: str
    hash_unique: str
    
    # IDs de relacionamento
    gym_id: str
    user_id: str
    
    # Temporal
    issued_at: datetime
    expires_at: datetime
    
    # Status e controle
    status: str  # 'active', 'inactive', 'pending', 'revoked', 'expired'
    access_type: str  # 'entry', 'workout', 'class', 'restricted_area'
    
    # Limites e uso
    usage_limits: TokenLimits
    
    # Segurança
    security: TokenSecurity
    
    # Metadados
    metadata: Dict[str, Any] = {}
    
    # Auditoria
    created_by: str
    last_validated_at: Optional[datetime] = None
    validation_count: int = 0

class TokenSystemManager:
    def __init__(self, secret_key: str = "fitpass-brasil-secret-2024"):
        self.secret_key = secret_key
        self.encryption_key = Fernet.generate_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
    def generate_unique_hash(self, data: str) -> str:
        """Gera hash único SHA-256"""
        return hashlib.sha256(f"{data}{secrets.token_hex(16)}".encode()).hexdigest()
    
    def generate_nonce(self) -> str:
        """Gera nonce para proteção contra replay"""
        return secrets.token_urlsafe(32)
    
    def create_jwt_signature(self, payload: Dict[str, Any]) -> str:
        """Cria assinatura JWT para o token"""
        return jwt.encode(payload, self.secret_key, algorithm="HS256")
    
    def verify_jwt_signature(self, token: str) -> Dict[str, Any]:
        """Verifica assinatura JWT"""
        try:
            return jwt.decode(token, self.secret_key, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            return {}
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Criptografa dados sensíveis"""
        return self.cipher_suite.encrypt(data.encode()).decode()
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Descriptografa dados sensíveis"""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()
    
    def generate_advanced_token(
        self,
        user_id: str,
        gym_id: str,
        access_type: str = "entry",
        validity_hours: int = 3,
        daily_limit: int = 3,
        monthly_limit: int = 60
    ) -> AdvancedToken:
        """Gera token avançado com todas as funcionalidades de segurança"""
        
        # Gerar IDs únicos
        token_id = str(uuid.uuid4())
        token_code = secrets.token_urlsafe(20)
        hash_unique = self.generate_unique_hash(f"{token_id}{user_id}{gym_id}")
        
        # Definir timestamps
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=validity_hours)
        
        # Gerar nonce para segurança
        nonce = self.generate_nonce()
        
        # Criar payload para assinatura JWT
        jwt_payload = {
            "token_id": token_id,
            "user_id": user_id,
            "gym_id": gym_id,
            "issued_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "nonce": nonce,
            "access_type": access_type
        }
        
        # Gerar assinatura JWT
        signature = self.create_jwt_signature(jwt_payload)
        
        # Criptografar dados sensíveis
        sensitive_data = json.dumps({
            "user_id": user_id,
            "gym_id": gym_id,
            "limits": {"daily": daily_limit, "monthly": monthly_limit}
        })
        encrypted_data = self.encrypt_sensitive_data(sensitive_data)
        
        # Criar estruturas de dados
        usage_limits = TokenLimits(
            daily_limit=daily_limit,
            monthly_limit=monthly_limit,
            current_daily_usage=0,
            current_monthly_usage=0
        )
        
        security = TokenSecurity(
            hash=hash_unique,
            signature=signature,
            nonce=nonce,
            encrypted_data=encrypted_data
        )
        
        # Criar token avançado
        advanced_token = AdvancedToken(
            token_id=token_id,
            token_code=token_code,
            hash_unique=hash_unique,
            gym_id=gym_id,
            user_id=user_id,
            issued_at=now,
            expires_at=expires_at,
            status="active",
            access_type=access_type,
            usage_limits=usage_limits,
            security=security,
            created_by=user_id,
            metadata={
                "generated_by": "fitpass_system",
                "version": "1.0",
                "features": ["jwt", "encryption", "nonce", "audit"]
            }
        )
        
        return advanced_token
    
    def validate_token_security(self, token: AdvancedToken) -> Dict[str, Any]:
        """Valida todos os aspectos de segurança do token"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "security_score": 100
        }
        
        # Verificar expiração
        now = datetime.now(timezone.utc)
        if now > token.expires_at:
            validation_result["valid"] = False
            validation_result["errors"].append("Token expirado")
            validation_result["security_score"] -= 50
        
        # Verificar status
        if token.status not in ["active", "pending"]:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Status inválido: {token.status}")
            validation_result["security_score"] -= 30
        
        # Verificar assinatura JWT
        try:
            decoded_payload = self.verify_jwt_signature(token.security.signature)
            if not decoded_payload:
                validation_result["valid"] = False
                validation_result["errors"].append("Assinatura JWT inválida")
                validation_result["security_score"] -= 40
            else:
                # Verificar consistência dos dados
                if decoded_payload.get("token_id") != token.token_id:
                    validation_result["valid"] = False
                    validation_result["errors"].append("Inconsistência nos dados do token")
                    validation_result["security_score"] -= 35
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Erro na verificação JWT: {str(e)}")
            validation_result["security_score"] -= 40
        
        # Verificar limites de uso
        if token.usage_limits.current_daily_usage >= token.usage_limits.daily_limit:
            validation_result["valid"] = False
            validation_result["errors"].append("Limite diário de uso excedido")
            validation_result["security_score"] -= 20
        
        if token.usage_limits.current_monthly_usage >= token.usage_limits.monthly_limit:
            validation_result["valid"] = False
            validation_result["errors"].append("Limite mensal de uso excedido")
            validation_result["security_score"] -= 20
        
        # Verificar nonce (proteção contra replay)
        if not token.security.nonce or len(token.security.nonce) < 32:
            validation_result["warnings"].append("Nonce inválido - possível ataque replay")
            validation_result["security_score"] -= 10
        
        # Verificar hash único (skip for now as it includes random component)
        # expected_hash = self.generate_unique_hash(f"{token.token_id}{token.user_id}{token.gym_id}")
        # if token.hash_unique != expected_hash:
        #     validation_result["warnings"].append("Hash único não confere - possível falsificação")
        #     validation_result["security_score"] -= 15
        
        return validation_result
    
    def create_audit_log(
        self,
        action: str,
        token_id: str,
        user_id: str,
        gym_id: Optional[str] = None,
        success: bool = True,
        failure_reason: Optional[str] = None,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> TokenAuditLog:
        """Cria log de auditoria para rastreamento"""
        
        return TokenAuditLog(
            timestamp=datetime.now(timezone.utc),
            action=action,
            user_id=user_id,
            gym_id=gym_id,
            device_info=device_info,
            ip_address=ip_address,
            success=success,
            failure_reason=failure_reason,
            token_id=token_id
        )
    
    def revoke_token(self, token: AdvancedToken, reason: str = "user_request") -> bool:
        """Revoga token e cria log de auditoria"""
        token.status = "revoked"
        token.metadata["revoked_at"] = datetime.now(timezone.utc).isoformat()
        token.metadata["revoke_reason"] = reason
        
        # Criar log de auditoria
        audit_log = self.create_audit_log(
            action="revoked",
            token_id=token.token_id,
            user_id=token.user_id,
            gym_id=token.gym_id,
            success=True
        )
        
        return True
    
    def update_usage_statistics(self, token: AdvancedToken) -> AdvancedToken:
        """Atualiza estatísticas de uso do token"""
        token.usage_limits.current_daily_usage += 1
        token.usage_limits.current_monthly_usage += 1
        token.validation_count += 1
        token.last_validated_at = datetime.now(timezone.utc)
        
        return token
    
    def get_token_analytics(self, tokens: List[AdvancedToken]) -> Dict[str, Any]:
        """Gera analytics completos dos tokens"""
        now = datetime.now(timezone.utc)
        
        analytics = {
            "total_tokens": len(tokens),
            "active_tokens": len([t for t in tokens if t.status == "active"]),
            "expired_tokens": len([t for t in tokens if t.expires_at < now]),
            "revoked_tokens": len([t for t in tokens if t.status == "revoked"]),
            "usage_stats": {
                "total_validations": sum(t.validation_count for t in tokens),
                "average_validations": sum(t.validation_count for t in tokens) / len(tokens) if tokens else 0,
                "most_used_access_type": self._get_most_common_access_type(tokens)
            },
            "security_stats": {
                "tokens_with_encryption": len([t for t in tokens if t.security.encrypted_data]),
                "tokens_with_jwt": len([t for t in tokens if t.security.signature]),
                "average_security_score": self._calculate_average_security_score(tokens)
            },
            "performance_stats": {
                "tokens_generated_today": len([t for t in tokens if t.issued_at.date() == now.date()]),
                "tokens_expiring_soon": len([t for t in tokens if t.expires_at < now + timedelta(hours=1)]),
                "high_usage_tokens": len([t for t in tokens if t.validation_count > 10])
            }
        }
        
        return analytics
    
    def _get_most_common_access_type(self, tokens: List[AdvancedToken]) -> str:
        """Retorna o tipo de acesso mais comum"""
        if not tokens:
            return "entry"
        
        access_types = [t.access_type for t in tokens]
        return max(set(access_types), key=access_types.count)
    
    def _calculate_average_security_score(self, tokens: List[AdvancedToken]) -> float:
        """Calcula score médio de segurança"""
        if not tokens:
            return 0.0
        
        scores = []
        for token in tokens:
            validation = self.validate_token_security(token)
            scores.append(validation["security_score"])
        
        return sum(scores) / len(scores)

# Instância global do gerenciador de tokens
token_manager = TokenSystemManager()