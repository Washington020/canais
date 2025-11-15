#!/usr/bin/env python3
import sys
from pymongo import MongoClient
from datetime import datetime, timezone

# Conectar no MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["luxepass"]

# Criar academia de teste no Grajaú
gym_data = {
    "name": "SmartFit Grajaú",
    "full_address": "Estrada do M'Boi Mirim, 5000 - Grajaú, São Paulo - SP",
    "phone": "(11) 3456-7890",
    "opening_hours": "Segunda a Sexta: 6h às 22h | Sábado: 8h às 20h | Domingo: 8h às 14h",
    "latitude": -23.7167,
    "longitude": -46.6986,
    "type": "fitness",
    "capacity": 200,
    "amenities": ["Musculação", "Cardio", "Vestiários", "Estacionamento"],
    "status": "active",
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc)
}

# Verificar se já existe
existing = db.gyms.find_one({"name": "SmartFit Grajaú"})

if existing:
    print("✅ Academia 'SmartFit Grajaú' já existe!")
    print(f"ID: {existing['_id']}")
else:
    result = db.gyms.insert_one(gym_data)
    print("✅ Academia criada com sucesso!")
    print(f"ID: {result.inserted_id}")
    print(f"Nome: {gym_data['name']}")
    print(f"Endereço: {gym_data['full_address']}")
    print(f"Coordenadas: {gym_data['latitude']}, {gym_data['longitude']}")

# Criar mais uma opção próxima
gym_data2 = {
    "name": "Academia Forma Grajaú",
    "full_address": "Rua Barão do Rio Bonito, 1500 - Grajaú, São Paulo - SP",
    "phone": "(11) 3789-1234",
    "opening_hours": "Segunda a Sábado: 6h às 22h | Domingo: 8h às 12h",
    "latitude": -23.7189,
    "longitude": -46.7012,
    "type": "fitness",
    "capacity": 150,
    "amenities": ["Musculação", "Cardio", "Spinning", "Vestiários"],
    "status": "active",
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc)
}

existing2 = db.gyms.find_one({"name": "Academia Forma Grajaú"})

if existing2:
    print("\n✅ Academia 'Academia Forma Grajaú' já existe!")
    print(f"ID: {existing2['_id']}")
else:
    result2 = db.gyms.insert_one(gym_data2)
    print("\n✅ Segunda academia criada com sucesso!")
    print(f"ID: {result2.inserted_id}")
    print(f"Nome: {gym_data2['name']}")
    print(f"Endereço: {gym_data2['full_address']}")
    print(f"Coordenadas: {gym_data2['latitude']}, {gym_data2['longitude']}")

print("\n🎉 Academias de teste criadas no Grajaú, São Paulo!")
print("📱 Agora você pode testar no app!")
