import re
from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class UserBase(BaseModel):
    name: str
    email: EmailStr
    mobile_number: Optional[str] = None
    role: UserRole = UserRole.USER
    auth_provider: str = "local"


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    mobile_number: str
    password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return v

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[0-9]{7,15}$", clean):
            raise ValueError("Please provide a valid mobile number (7-15 digits, optional + prefix).")
        return clean

    @field_validator("password")
    @classmethod
    def validate_strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z).")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter (a-z).")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number (0-9).")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&* etc.).")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: EmailStr
    mobile_number: Optional[str] = None
    role: UserRole
    auth_provider: str = "local"
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class UserInDB(UserBase):
    id: Optional[str] = Field(None, alias="_id")
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("New password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("New password must contain at least one lowercase letter.")
        if not re.search(r"[0-9]", v):
            raise ValueError("New password must contain at least one number.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_]", v):
            raise ValueError("New password must contain at least one special character.")
        return v
