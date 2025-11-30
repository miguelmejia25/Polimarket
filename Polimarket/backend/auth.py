from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.hash import bcrypt
from sqlmodel import Session
from .db import get_session
from .models import User

SECRET = "CHANGE_ME"  # Cámbialo en producción
ALGO = "HS256"
ACCESS_MINUTES = 60 * 24

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---- HELPERS ----
def hash_pwd(pw: str):
    """
    Genera un hash de la contraseña.
    Bcrypt solo acepta hasta 72 bytes, truncamos si es necesario.
    """
    truncated = pw[:72]
    return bcrypt.hash(truncated)


def verify_pwd(pw: str, h: str):
    """
    Verifica si la contraseña coincide con el hash.
    """
    truncated = pw[:72]
    return bcrypt.verify(truncated, h)


def create_token(user: User):
    """
    Crea un token JWT para un usuario.
    """
    payload = {"sub": str(user.id), "exp": datetime.utcnow() + timedelta(minutes=ACCESS_MINUTES)}
    return jwt.encode(payload, SECRET, algorithm=ALGO)


async def get_current_user(token: str = Depends(oauth2), session: Session = Depends(get_session)) -> User:
    """
    Devuelve el usuario autenticado a partir del token.
    """
    try:
        data = jwt.decode(token, SECRET, algorithms=[ALGO])
        uid = int(data.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = session.get(User, uid)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user
