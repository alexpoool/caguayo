from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class MessageChannel(StrEnum):
    """Canal lógico de la conversación."""

    PERSON_TO_PERSON = "person_to_person"
    PERSON_TO_AGENT = "person_to_agent"


class MessageEventType(StrEnum):
    """Eventos iniciales del módulo de mensajería."""

    CREATED = "caguayo.message.created"
    DELIVERED = "caguayo.message.delivered"
    READ = "caguayo.message.read"
    AGENT_REQUESTED = "caguayo.agent.requested"
    AGENT_COMPLETED = "caguayo.agent.completed"
    AGENT_FAILED = "caguayo.agent.failed"


class MessagePayload(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MessageEvent(BaseModel):
    """Envelope estable que viajará por Kafka."""

    event_id: UUID = Field(default_factory=uuid4)
    event_type: MessageEventType = MessageEventType.CREATED
    tenant_id: str = Field(min_length=1, max_length=128)
    conversation_id: UUID = Field(default_factory=uuid4)
    message_id: UUID = Field(default_factory=uuid4)
    channel: MessageChannel
    sender_id: int
    recipient_id: int | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payload: MessagePayload
