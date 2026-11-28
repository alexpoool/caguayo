import os

from fastapi import APIRouter, Header, HTTPException
from jose import jwt
from pydantic import BaseModel, Field

from src.core.config import settings
from src.messaging.contracts import (
    MessageChannel,
    MessageEvent,
    MessageEventType,
    MessagePayload,
)
from src.messaging.event_bus import get_event_publisher

router = APIRouter(prefix="/mensajeria", tags=["mensajeria"])

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")


class MessageCreateRequest(BaseModel):
    channel: MessageChannel
    recipient_id: int | None = None
    text: str = Field(min_length=1, max_length=20_000)


def _token_payload(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc


@router.get("/capabilities")
async def messaging_capabilities():
    return {
        "channels": [channel.value for channel in MessageChannel],
        "event_bus": "kafka" if settings.KAFKA_ENABLED else "logging",
        "kafka_topic": settings.KAFKA_MESSAGE_TOPIC,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_base_url": settings.LLM_BASE_URL,
    }


@router.post("/messages", response_model=MessageEvent, status_code=202)
async def create_message(
    data: MessageCreateRequest,
    authorization: str = Header(None),
):
    payload = _token_payload(authorization)
    sender_id = payload.get("sub")
    tenant_id = payload.get("base_datos")

    if sender_id is None:
        raise HTTPException(status_code=422, detail="El token no contiene el identificador del usuario")
    if not tenant_id:
        raise HTTPException(status_code=422, detail="El token no contiene la base de datos del tenant")

    if data.channel == MessageChannel.PERSON_TO_PERSON and data.recipient_id is None:
        raise HTTPException(
            status_code=422,
            detail="recipient_id es obligatorio para mensajes persona-persona",
        )

    event_type = (
        MessageEventType.AGENT_REQUESTED
        if data.channel == MessageChannel.PERSON_TO_AGENT
        else MessageEventType.CREATED
    )

    event = MessageEvent(
        event_type=event_type,
        tenant_id=tenant_id,
        channel=data.channel,
        sender_id=int(sender_id),
        recipient_id=data.recipient_id,
        payload=MessagePayload(text=data.text),
    )

    publisher = get_event_publisher()
    await publisher.publish(event)
    return event
