from pydantic import BaseModel
from datetime import date
from typing import Literal

class Asset(BaseModel):
    id: str
    nominal_value: float
    status: Literal["active", "defaulted", "paid"]
    due_date: date

class Insight(BaseModel):
    id: str
    name: str
    value: float

class HealthResponse(BaseModel):
    status: str
    version: str
