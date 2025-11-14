import socketio
import logging
from typing import Dict, Set

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Store active rooms and participants
rooms: Dict[str, Set[str]] = {}
user_to_room: Dict[str, str] = {}

@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"🔌 Cliente conectado: {sid}")
    await sio.emit('connected', {'sid': sid}, to=sid)

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"🔌 Cliente desconectado: {sid}")
    
    # Remove from room if exists
    if sid in user_to_room:
        room = user_to_room[sid]
        if room in rooms and sid in rooms[room]:
            rooms[room].remove(sid)
            
            # Notify other participants
            await sio.emit('user-left', {'userId': sid}, room=room, skip_sid=sid)
            
            # Clean up empty room
            if len(rooms[room]) == 0:
                del rooms[room]
                logger.info(f"🗑️ Sala vazia removida: {room}")
        
        del user_to_room[sid]

@sio.event
async def join_room(sid, data):
    """Handle user joining a video room"""
    room = data.get('room')
    user_name = data.get('userName', 'Usuário')
    
    logger.info(f"👤 {user_name} ({sid}) entrando na sala: {room}")
    
    # Create room if doesn't exist
    if room not in rooms:
        rooms[room] = set()
    
    # Add user to room
    rooms[room].add(sid)
    user_to_room[sid] = room
    
    # Join Socket.IO room
    await sio.enter_room(sid, room)
    
    # Get other users in room
    other_users = [user_sid for user_sid in rooms[room] if user_sid != sid]
    
    # Notify the joining user about existing participants
    await sio.emit('room-joined', {
        'room': room,
        'participants': other_users,
        'userName': user_name
    }, to=sid)
    
    # Notify existing participants about new user
    if other_users:
        await sio.emit('user-joined', {
            'userId': sid,
            'userName': user_name
        }, room=room, skip_sid=sid)
        
        logger.info(f"✅ {user_name} entrou na sala {room} com {len(other_users)} participantes")
    else:
        logger.info(f"✅ {user_name} é o primeiro na sala {room}")

@sio.event
async def leave_room(sid, data):
    """Handle user leaving a video room"""
    room = data.get('room')
    
    if room in rooms and sid in rooms[room]:
        rooms[room].remove(sid)
        await sio.leave_room(sid, room)
        
        # Notify others
        await sio.emit('user-left', {'userId': sid}, room=room)
        
        if sid in user_to_room:
            del user_to_room[sid]
        
        logger.info(f"👋 Usuário {sid} saiu da sala {room}")

@sio.event
async def offer(sid, data):
    """Forward WebRTC offer"""
    target = data.get('target')
    offer_data = data.get('offer')
    
    logger.info(f"📤 Enviando offer de {sid} para {target}")
    
    await sio.emit('offer', {
        'offer': offer_data,
        'sender': sid
    }, to=target)

@sio.event
async def answer(sid, data):
    """Forward WebRTC answer"""
    target = data.get('target')
    answer_data = data.get('answer')
    
    logger.info(f"📤 Enviando answer de {sid} para {target}")
    
    await sio.emit('answer', {
        'answer': answer_data,
        'sender': sid
    }, to=target)

@sio.event
async def ice_candidate(sid, data):
    """Forward ICE candidate"""
    target = data.get('target')
    candidate = data.get('candidate')
    
    await sio.emit('ice-candidate', {
        'candidate': candidate,
        'sender': sid
    }, to=target)

@sio.event
async def get_room_info(sid, data):
    """Get information about a room"""
    room = data.get('room')
    
    if room in rooms:
        participants = list(rooms[room])
        await sio.emit('room-info', {
            'room': room,
            'participants': participants,
            'count': len(participants)
        }, to=sid)
    else:
        await sio.emit('room-info', {
            'room': room,
            'participants': [],
            'count': 0
        }, to=sid)

# Create ASGI app
sio_app = socketio.ASGIApp(sio)
