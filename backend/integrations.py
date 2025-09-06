<file>
      <absolute_file_name>/app/backend/integrations.py</absolute_file_name>
      <content"># Advanced Integrations for FitPass Brasil
from fastapi import APIRouter, HTTPException, Depends, Request, status, Header
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from emergentintegrations.llm import LLMService
import os
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
import json
import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

# Initialize integrations
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk-test-51PxqFfJchv7KIiWYvSJNK4jkqFYQ0dYLqP9t5C4WEq7mfBb1ypHxP5Q9N4S2sE2VT4nT4oT4pT5fP1Q9N4S2sE3')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-f400b75B69872D785E')
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', 'AIzaSyBVVQQ_XdWYkxFxFxFxFxFxFxFxFxFxFx')

# Initialize LLM Service
llm_service = LLMService(api_key=EMERGENT_LLM_KEY)

# Stripe Integration Models
class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    payment_status: str  # initiated, pending, completed, failed, expired
    amount: float
    currency: str = "BRL"
    plan_type: str
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateCheckoutRequest(BaseModel):
    plan_type: str
    success_url: str
    cancel_url: str

class AIRecommendationRequest(BaseModel):
    user_id: str
    context: str  # workout, nutrition, etc.
    user_data: Dict[str, Any] = {}

class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = 5.0

class NotificationRequest(BaseModel):
    user_id: str
    title: str
    body: str
    data: Dict[str, Any] = {}

# Router for integrations
integration_router = APIRouter(prefix="/api/integrations")

# Subscription Plans Configuration
SUBSCRIPTION_PLANS = {
    "basic": {
        "name": "Básico",
        "price": 90.00,
        "tokens_per_day": 1,
        "features": ["Acesso a academias básicas", "App móvel", "Suporte básico"]
    },
    "intermediate": {
        "name": "Intermediário", 
        "price": 120.00,
        "tokens_per_day": 1,
        "features": ["Acesso a todas academias", "Consultas nutricionais", "Suporte prioritário"]
    },
    "premium": {
        "name": "Premium",
        "price": 149.90,
        "tokens_per_day": 2,
        "features": ["2 tokens/dia", "IA Personal Trainer", "Nutrição avançada", "Suporte 24/7"]
    }
}

# STRIPE PAYMENT INTEGRATION
@integration_router.post("/payments/checkout/session")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    http_request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Create Stripe checkout session for subscription"""
    try:
        # Validate plan
        if request.plan_type not in SUBSCRIPTION_PLANS:
            raise HTTPException(400, "Invalid subscription plan")
        
        plan = SUBSCRIPTION_PLANS[request.plan_type]
        
        # Initialize Stripe
        host_url = str(http_request.base_url)
        webhook_url = f"{host_url}api/integrations/payments/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency="BRL",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                "user_id": current_user.id,
                "plan_type": request.plan_type,
                "source": "fitpass_app"
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            user_id=current_user.id,
            session_id=session.session_id,
            payment_status="initiated",
            amount=plan["price"],
            currency="BRL",
            plan_type=request.plan_type,
            metadata=checkout_request.metadata
        )
        
        await db.payment_transactions.insert_one(transaction.dict())
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        raise HTTPException(500, f"Payment session creation failed: {str(e)}")

@integration_router.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get checkout session status"""
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        status_response: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update local transaction record
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction["payment_status"] != "completed":
            update_data = {
                "payment_status": status_response.payment_status,
                "updated_at": datetime.now(timezone.utc)
            }
            
            # If payment completed, update user subscription
            if status_response.payment_status == "paid":
                user_id = transaction["user_id"]
                plan_type = transaction["plan_type"]
                plan = SUBSCRIPTION_PLANS[plan_type]
                
                # Update user subscription
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {
                        "$set": {
                            "plan_type": plan_type,
                            "subscription_end": datetime.now(timezone.utc) + timedelta(days=30),
                            "tokens_available": plan["tokens_per_day"] * 30
                        }
                    }
                )
                
                update_data["payment_status"] = "completed"
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
        
        return {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency
        }
        
    except Exception as e:
        raise HTTPException(500, f"Status check failed: {str(e)}")

@integration_router.post("/payments/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        # Process webhook based on event type
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            
            # Update transaction status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "completed",
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Update user subscription
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                user_id = transaction["user_id"]
                plan_type = transaction["plan_type"]
                plan = SUBSCRIPTION_PLANS[plan_type]
                
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {
                        "$set": {
                            "plan_type": plan_type,
                            "subscription_end": datetime.now(timezone.utc) + timedelta(days=30),
                            "tokens_available": plan["tokens_per_day"] * 30
                        }
                    }
                )
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(500, f"Webhook processing failed: {str(e)}")

# AI RECOMMENDATIONS INTEGRATION
@integration_router.post("/ai/workout-recommendation")
async def get_workout_recommendation(
    request: AIRecommendationRequest,
    current_user = Depends(get_current_user)
):
    """Generate AI-powered workout recommendations"""
    try:
        # Get user data for context
        user_context = f"""
        User Profile:
        - Plan: {current_user.plan_type}
        - Fitness Level: {request.user_data.get('fitness_level', 'intermediate')}
        - Goals: {request.user_data.get('goals', 'general fitness')}
        - Available Time: {request.user_data.get('available_time', '45 minutes')}
        - Equipment Access: {request.user_data.get('equipment', 'full gym')}
        
        Generate a personalized workout recommendation for today.
        """
        
        response = await llm_service.chat_completion(
            messages=[
                {"role": "system", "content": "You are an expert personal trainer providing workout recommendations."},
                {"role": "user", "content": user_context}
            ],
            model="gpt-4",
            max_tokens=500
        )
        
        return {
            "recommendation": response.choices[0].message.content,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(500, f"AI recommendation failed: {str(e)}")

@integration_router.post("/ai/nutrition-advice")
async def get_nutrition_advice(
    request: AIRecommendationRequest,
    current_user = Depends(get_current_user)
):
    """Generate AI-powered nutrition advice"""
    try:
        user_context = f"""
        User Profile:
        - Age: {request.user_data.get('age', 30)}
        - Weight: {request.user_data.get('weight', 70)}kg
        - Height: {request.user_data.get('height', 170)}cm
        - Activity Level: {request.user_data.get('activity_level', 'moderate')}
        - Dietary Restrictions: {request.user_data.get('restrictions', 'none')}
        - Goals: {request.user_data.get('goals', 'maintain weight')}
        
        Provide personalized nutrition advice and meal suggestions for today.
        Focus on Brazilian foods and preferences.
        """
        
        response = await llm_service.chat_completion(
            messages=[
                {"role": "system", "content": "You are a certified nutritionist specializing in Brazilian cuisine and fitness nutrition."},
                {"role": "user", "content": user_context}
            ],
            model="gpt-4",
            max_tokens=600
        )
        
        return {
            "advice": response.choices[0].message.content,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(500, f"Nutrition advice failed: {str(e)}")

# GOOGLE MAPS INTEGRATION
@integration_router.post("/maps/nearby-gyms")
async def get_nearby_gyms(
    location: LocationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Find nearby gyms using Google Places API"""
    try:
        async with httpx.AsyncClient() as client:
            # Search for nearby gyms
            response = await client.get(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                params={
                    "location": f"{location.latitude},{location.longitude}",
                    "radius": location.radius_km * 1000,  # Convert to meters
                    "type": "gym",
                    "key": GOOGLE_MAPS_API_KEY
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(500, "Google Places API request failed")
            
            places_data = response.json()
            
            # Process results
            nearby_gyms = []
            for place in places_data.get("results", [])[:10]:  # Limit to 10 results
                gym_data = {
                    "google_place_id": place["place_id"],
                    "name": place["name"],
                    "address": place.get("vicinity", ""),
                    "latitude": place["geometry"]["location"]["lat"],
                    "longitude": place["geometry"]["location"]["lng"],
                    "rating": place.get("rating", 0),
                    "price_level": place.get("price_level", 0),
                    "is_partner": False  # Check if it's a FitPass partner
                }
                
                # Check if this gym is a FitPass partner
                partner_gym = await db.gyms.find_one({"google_place_id": place["place_id"]})
                if partner_gym:
                    gym_data.update({
                        "is_partner": True,
                        "accepted_plans": partner_gym.get("accepted_plans", []),
                        "partner_id": str(partner_gym["_id"])
                    })
                
                nearby_gyms.append(gym_data)
            
            return {
                "gyms": nearby_gyms,
                "total_found": len(nearby_gyms)
            }
            
    except Exception as e:
        raise HTTPException(500, f"Nearby gyms search failed: {str(e)}")

@integration_router.get("/maps/directions")
async def get_directions(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float
):
    """Get directions between two points"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/directions/json",
                params={
                    "origin": f"{origin_lat},{origin_lng}",
                    "destination": f"{dest_lat},{dest_lng}",
                    "mode": "driving",
                    "language": "pt-BR",
                    "key": GOOGLE_MAPS_API_KEY
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(500, "Google Directions API request failed")
            
            directions_data = response.json()
            
            if directions_data["status"] != "OK":
                raise HTTPException(400, f"Directions not found: {directions_data['status']}")
            
            route = directions_data["routes"][0]
            leg = route["legs"][0]
            
            return {
                "distance": leg["distance"]["text"],
                "duration": leg["duration"]["text"],
                "steps": [
                    {
                        "instruction": step["html_instructions"],
                        "distance": step["distance"]["text"],
                        "duration": step["duration"]["text"]
                    }
                    for step in leg["steps"]
                ]
            }
            
    except Exception as e:
        raise HTTPException(500, f"Directions request failed: {str(e)}")

# PUSH NOTIFICATIONS INTEGRATION
@integration_router.post("/notifications/send")
async def send_push_notification(
    notification: NotificationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Send push notification to user"""
    try:
        # Get user's push token
        user = await db.users.find_one({"_id": ObjectId(notification.user_id)})
        if not user or not user.get("push_token"):
            raise HTTPException(404, "User push token not found")
        
        # Send notification using Expo Push API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json={
                    "to": user["push_token"],
                    "title": notification.title,
                    "body": notification.body,
                    "data": notification.data,
                    "sound": "default"
                },
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(500, "Push notification failed")
            
            # Log notification
            await db.notifications.insert_one({
                "user_id": notification.user_id,
                "title": notification.title,
                "body": notification.body,
                "data": notification.data,
                "sent_at": datetime.now(timezone.utc),
                "status": "sent"
            })
            
            return {"status": "sent", "response": response.json()}
            
    except Exception as e:
        raise HTTPException(500, f"Notification sending failed: {str(e)}")

# ANALYTICS INTEGRATION
@integration_router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Get advanced analytics for admin dashboard"""
    try:
        # User metrics
        total_users = await db.users.count_documents({})
        active_users = await db.users.count_documents({
            "subscription_end": {"$gt": datetime.now(timezone.utc)}
        })
        
        # Revenue metrics
        total_revenue = await db.payment_transactions.aggregate([
            {"$match": {"payment_status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        monthly_revenue = await db.payment_transactions.aggregate([
            {
                "$match": {
                    "payment_status": "completed",
                    "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        # Token usage metrics
        tokens_generated = await db.token_usage.count_documents({
            "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
        })
        
        tokens_used = await db.token_usage.count_documents({
            "is_used": True,
            "used_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
        })
        
        # Popular gyms
        popular_gyms = await db.token_usage.aggregate([
            {"$match": {"is_used": True, "gym_id": {"$ne": None}}},
            {"$group": {"_id": "$gym_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]).to_list(5)
        
        return {
            "users": {
                "total": total_users,
                "active": active_users,
                "churn_rate": round((1 - active_users / max(total_users, 1)) * 100, 2)
            },
            "revenue": {
                "total": total_revenue[0]["total"] if total_revenue else 0,
                "monthly": monthly_revenue[0]["total"] if monthly_revenue else 0
            },
            "tokens": {
                "generated_week": tokens_generated,
                "used_week": tokens_used,
                "usage_rate": round((tokens_used / max(tokens_generated, 1)) * 100, 2)
            },
            "popular_gyms": popular_gyms
        }
        
    except Exception as e:
        raise HTTPException(500, f"Analytics generation failed: {str(e)}")

# USER PREFERENCES FOR PUSH TOKENS
@integration_router.post("/users/push-token")
async def register_push_token(
    push_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Register user's push notification token"""
    try:
        await db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"push_token": push_token, "push_enabled": True}}
        )
        
        return {"status": "success", "message": "Push token registered"}
        
    except Exception as e:
        raise HTTPException(500, f"Push token registration failed: {str(e)}")
</content>
    </file>