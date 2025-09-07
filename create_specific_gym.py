#!/usr/bin/env python3
"""
Create a gym with specific credentials for testing
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client['fitpass_brasil']

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_specific_gym():
    """Create gym with specific credentials: gym_academia_teste_2039/sm7zK4QN"""
    
    # Check if gym already exists
    existing_gym = await db.gyms.find_one({"login": "gym_academia_teste_2039"})
    
    if existing_gym:
        print(f"✅ Gym with login 'gym_academia_teste_2039' already exists!")
        print(f"   Name: {existing_gym.get('name')}")
        print(f"   Status: {existing_gym.get('status')}")
        return str(existing_gym["_id"])
    
    # Hash the specific password
    hashed_password = pwd_context.hash("sm7zK4QN")
    
    # Create gym document with specific credentials
    gym_doc = {
        "name": "Academia Teste 2039 - Credenciais Específicas",
        "cnpj": "12.345.678/0001-39",
        "razao_social": "Academia Teste 2039 Ltda",
        "address": "Rua Teste Específico, 2039 - Vila Teste, São Paulo/SP",
        "endereco_completo": {
            "endereco": "Rua Teste Específico",
            "numero": "2039",
            "complemento": "",
            "bairro": "Vila Teste",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567"
        },
        "email": "teste2039@academiateste.com",
        "site": "",
        "phone": "(11) 99999-2039",
        "telefone_secundario": "",
        "horario_funcionamento": "06:00 às 22:00",
        "type": "Tradicional",
        "franquia": "",
        "num_unidades": "1",
        "responsavel": {
            "nome": "Responsável Teste 2039",
            "cargo": "Gerente",
            "email": "responsavel2039@academiateste.com",
            "telefone": "(11) 88888-2039"
        },
        "modelo_negocio": "Academia tradicional",
        "dados_legais": {
            "inscricao_estadual": "123456789",
            "alvara_funcionamento": "ALV-2039",
            "documento_responsavel": "123.456.789-00"
        },
        "dados_operacionais": {
            "recursos_oferecidos": "Musculação, Cardio, Funcional",
            "politicas_cancelamento": "30 dias de antecedência",
            "observacoes_qualidade": "Academia de alta qualidade"
        },
        "login": "gym_academia_teste_2039",  # Exact login requested
        "hashed_password": hashed_password,   # Exact password requested (hashed)
        "status": "approved",  # Approved so it can be used for authentication
        "created_at": datetime.now(timezone.utc),
        "approved_at": datetime.now(timezone.utc)
    }
    
    # Insert gym into database
    result = await db.gyms.insert_one(gym_doc)
    
    print(f"✅ Created gym with specific credentials!")
    print(f"   Gym ID: {result.inserted_id}")
    print(f"   Login: gym_academia_teste_2039")
    print(f"   Password: sm7zK4QN")
    print(f"   Name: {gym_doc['name']}")
    print(f"   Status: {gym_doc['status']}")
    
    return str(result.inserted_id)

async def main():
    try:
        gym_id = await create_specific_gym()
        print(f"\n🎯 Gym created successfully with ID: {gym_id}")
        print(f"You can now test with credentials: gym_academia_teste_2039/sm7zK4QN")
    except Exception as e:
        print(f"❌ Error creating gym: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())