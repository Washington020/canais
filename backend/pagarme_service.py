import httpx
import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import base64

logger = logging.getLogger(__name__)

class PagarMeService:
    def __init__(self):
        self.api_key = os.environ.get('PAGARME_API_KEY')
        self.base_url = "https://api.pagar.me/core/v5"
        
        if not self.api_key:
            raise ValueError("PAGARME_API_KEY não encontrada nas variáveis de ambiente")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Pagar.me API requests"""
        # Pagar.me uses Basic Auth with API key as username
        auth_string = f"{self.api_key}:"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        return {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/json"
        }
    
    async def create_order(
        self,
        amount: int,  # Amount in cents
        currency: str,
        customer: Dict[str, Any],
        payment_method: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new order in Pagar.me"""
        try:
            # Convert amount to cents if it's in reais
            if amount < 100:  # Assume it's in reais if less than 1 real in cents
                amount = int(amount * 100)
            
            order_data = {
                "amount": amount,
                "currency": currency.upper(),
                "customer": customer,
                "metadata": metadata or {},
                "payment": self._get_payment_config(payment_method, amount),
                "closed": True
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/orders",
                    json=order_data,
                    headers=self._get_headers()
                )
                
                if response.status_code not in [200, 201]:
                    logger.error(f"Erro na API Pagar.me: {response.status_code}, {response.text}")
                    raise Exception(f"Erro na API Pagar.me: {response.status_code}")
                
                result = response.json()
                logger.info(f"Ordem criada no Pagar.me: {result.get('id')}")
                
                return {
                    "order_id": result.get("id"),
                    "status": result.get("status"),
                    "amount": result.get("amount"),
                    "currency": result.get("currency"),
                    "payment_method": payment_method,
                    "charges": result.get("charges", []),
                    "checkouts": result.get("checkouts", []),
                    "response": result
                }
                
        except Exception as e:
            logger.error(f"Erro ao criar ordem no Pagar.me: {e}")
            raise
    
    def _get_payment_config(self, payment_method: str, amount: int) -> Dict[str, Any]:
        """Get payment configuration based on method"""
        
        if payment_method == "pix":
            return {
                "payment_method": "pix",
                "pix": {
                    "expires_in": 3600  # 1 hour expiration
                }
            }
        
        elif payment_method == "boleto":
            return {
                "payment_method": "boleto",
                "boleto": {
                    "instructions": "Pagamento da assinatura LuxePass",
                    "due_at": self._get_boleto_due_date()
                }
            }
        
        elif payment_method == "credit_card":
            return {
                "payment_method": "credit_card",
                "credit_card": {
                    "installments": 1,
                    "capture": True
                }
            }
        
        else:
            # Default to PIX
            return {
                "payment_method": "pix",
                "pix": {
                    "expires_in": 3600
                }
            }
    
    def _get_boleto_due_date(self) -> str:
        """Get due date for boleto (3 days from now)"""
        from datetime import timedelta
        due_date = datetime.now(timezone.utc) + timedelta(days=3)
        return due_date.strftime("%Y-%m-%d")
    
    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """Get order details from Pagar.me"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/orders/{order_id}",
                    headers=self._get_headers()
                )
                
                if response.status_code != 200:
                    logger.error(f"Erro ao buscar ordem: {response.status_code}, {response.text}")
                    raise Exception(f"Erro ao buscar ordem: {response.status_code}")
                
                result = response.json()
                
                return {
                    "order_id": result.get("id"),
                    "status": result.get("status"),
                    "amount": result.get("amount"),
                    "currency": result.get("currency"),
                    "charges": result.get("charges", []),
                    "payment_method": self._extract_payment_method(result),
                    "payment_url": self._extract_payment_url(result),
                    "qr_code": self._extract_qr_code(result),
                    "boleto_url": self._extract_boleto_url(result),
                    "response": result
                }
                
        except Exception as e:
            logger.error(f"Erro ao buscar ordem: {e}")
            raise
    
    def _extract_payment_method(self, order_data: Dict[str, Any]) -> str:
        """Extract payment method from order data"""
        charges = order_data.get("charges", [])
        if charges and len(charges) > 0:
            return charges[0].get("payment_method", "unknown")
        return "unknown"
    
    def _extract_payment_url(self, order_data: Dict[str, Any]) -> Optional[str]:
        """Extract payment URL for checkout"""
        checkouts = order_data.get("checkouts", [])
        if checkouts and len(checkouts) > 0:
            return checkouts[0].get("payment_url")
        return None
    
    def _extract_qr_code(self, order_data: Dict[str, Any]) -> Optional[str]:
        """Extract PIX QR code from order data"""
        charges = order_data.get("charges", [])
        for charge in charges:
            if charge.get("payment_method") == "pix":
                last_transaction = charge.get("last_transaction")
                if last_transaction:
                    return last_transaction.get("qr_code")
        return None
    
    def _extract_boleto_url(self, order_data: Dict[str, Any]) -> Optional[str]:
        """Extract boleto URL from order data"""
        charges = order_data.get("charges", [])
        for charge in charges:
            if charge.get("payment_method") == "boleto":
                last_transaction = charge.get("last_transaction")
                if last_transaction:
                    return last_transaction.get("url")
        return None
    
    async def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a customer in Pagar.me"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/customers",
                    json=customer_data,
                    headers=self._get_headers()
                )
                
                if response.status_code not in [200, 201]:
                    logger.error(f"Erro ao criar cliente: {response.status_code}, {response.text}")
                    # Don't raise exception for customer creation errors
                    return {}
                
                return response.json()
                
        except Exception as e:
            logger.error(f"Erro ao criar cliente: {e}")
            return {}
    
    def format_customer_data(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format user data for Pagar.me customer creation"""
        return {
            "name": user_data.get("name", "Cliente LuxePass"),
            "email": user_data.get("email", ""),
            "type": "individual",
            "document": user_data.get("document", ""),
            "document_type": "cpf",
            "phones": {
                "mobile_phone": {
                    "country_code": "55",
                    "area_code": "11",
                    "number": user_data.get("phone", "999999999")
                }
            },
            "address": {
                "country": "BR",
                "state": user_data.get("state", "SP"),
                "city": user_data.get("city", "São Paulo"),
                "zip_code": user_data.get("zip_code", "01000000"),
                "line_1": user_data.get("address", "Rua Example, 123")
            }
        }

# Global instance
pagarme_service = PagarMeService()