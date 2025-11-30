from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from typing import Dict, Set
from jose import jwt, JWTError
import json
import os
import shutil
from pydantic import BaseModel

from .db import init_db, get_session
from .models import User, Product, Chat, Message
from .auth import get_current_user, create_token, hash_pwd, verify_pwd, SECRET, ALGO

# ---------------- Pydantic Models ----------------
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

# ---------------- App Initialization ----------------
app = FastAPI(title="PoliMarket")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

BASE_URL = "http://127.0.0.1:8000"
os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
def on_startup():
    init_db()

# ---------------- AUTH ----------------
@app.post("/auth/register")
def register(request: RegisterRequest, session: Session = Depends(get_session)):
    if not request.email.lower().endswith("@espol.edu.ec"):
        raise HTTPException(status_code=400, detail="Registro fallido. Solo correos @espol.edu.ec permitidos")
    
    if session.exec(select(User).where(User.email == request.email)).first():
        raise HTTPException(status_code=400, detail="Email ya usado")
    
    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_pwd(request.password)  # ahora seguro con truncado a 72 bytes
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id}

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_pwd(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return {"access_token": create_token(user), "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
def get_me(user: User = Depends(get_current_user)):
    return user

# ---------------- PRODUCTS ----------------
@app.get("/products")
def list_products(session: Session = Depends(get_session)):
    return session.exec(select(Product).order_by(Product.created_at.desc())).all()

@app.get("/products/{pid}")
def product_detail(pid: int, session: Session = Depends(get_session)):
    product = session.get(Product, pid)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product

@app.post("/products")
def create_product(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Guardar archivo
    file_path = f"static/images/{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        file.file.close()

    image_url = f"{BASE_URL}/{file_path}"
    product = Product(
        title=title,
        description=description,
        price=price,
        image_url=image_url,
        seller_id=user.id
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

# ---------------- CHATS ----------------
@app.post("/chats/start")
def start_chat(product_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no existe")
    if product.seller_id == user.id:
        raise HTTPException(status_code=400, detail="No puedes chatear contigo mismo")
    chat = session.exec(select(Chat).where(Chat.product_id==product_id, Chat.buyer_id==user.id)).first()
    if not chat:
        chat = Chat(product_id=product_id, buyer_id=user.id, seller_id=product.seller_id)
        session.add(chat)
        session.commit()
        session.refresh(chat)
    return {"chat_id": chat.id}

@app.get("/chats/my")
def get_my_chats(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    chats = session.exec(
        select(Chat).where((Chat.buyer_id==user.id) | (Chat.seller_id==user.id)).order_by(Chat.created_at.desc())
    ).all()
    
    results = []
    for chat in chats:
        session.refresh(chat.product)
        session.refresh(chat.buyer)
        session.refresh(chat.seller)
        results.append(chat)
    return results

@app.get("/chats/{chat_id}/messages")
def get_message_history(chat_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    chat = session.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    if user.id not in (chat.buyer_id, chat.seller_id):
        raise HTTPException(status_code=403, detail="No autorizado para este chat")
    messages = session.exec(select(Message).where(Message.chat_id==chat_id).order_by(Message.created_at.asc())).all()
    return messages

# ---------------- WEBSOCKETS ----------------
async def get_current_user_ws(token: str, session: Session = Depends(get_session)) -> User:
    try:
        data = jwt.decode(token, SECRET, algorithms=[ALGO])
        uid = int(data.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise WebSocketDisconnect(code=1008, reason="Token inválido o expirado")
    user = session.get(User, uid)
    if not user:
        raise WebSocketDisconnect(code=1008, reason="Usuario no encontrado")
    return user

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[int, Set[WebSocket]] = {}
    async def connect(self, chat_id: int, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(chat_id, set()).add(ws)
    def disconnect(self, chat_id: int, ws: WebSocket):
        self.rooms.get(chat_id, set()).discard(ws)
    async def broadcast(self, chat_id: int, message: dict):
        for ws in list(self.rooms.get(chat_id, set())):
            await ws.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/chats/{chat_id}")
async def chat_ws(chat_id: int, ws: WebSocket, token: str = Query(...)):
    session = next(get_session())
    try:
        user = await get_current_user_ws(token, session)
        chat = session.get(Chat, chat_id)
        if not chat or user.id not in (chat.buyer_id, chat.seller_id):
            await ws.close(code=1008, reason="No autorizado para este chat")
            return
        await manager.connect(chat_id, ws)
        try:
            while True:
                data_str = await ws.receive_text()
                data = json.loads(data_str)
                msg = Message(chat_id=chat_id, author_id=user.id, text=data["text"])
                session.add(msg); session.commit(); session.refresh(msg)
                await manager.broadcast(chat_id, {
                    "author_id": msg.author_id,
                    "author_name": user.name,
                    "text": msg.text,
                    "created_at": str(msg.created_at)
                })
        except WebSocketDisconnect:
            manager.disconnect(chat_id, ws)
    finally:
        session.close()
