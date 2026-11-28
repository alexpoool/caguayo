from __future__ import annotations

import json
import logging
from typing import Protocol

from src.core.config import settings
from src.messaging.contracts import MessageEvent

logger = logging.getLogger(__name__)


class EventPublisher(Protocol):
    async def publish(self, event: MessageEvent) -> None:
        """Publica un evento de mensajería."""


class LoggingEventPublisher:
    async def publish(self, event: MessageEvent) -> None:
        logger.info(
            "messaging_event=%s",
            json.dumps(event.model_dump(mode="json"), ensure_ascii=False),
        )


class KafkaEventPublisher:
    async def publish(self, event: MessageEvent) -> None:
        try:
            from aiokafka import AIOKafkaProducer
        except ImportError as exc:
            raise RuntimeError("KAFKA_ENABLED=true requiere instalar aiokafka") from exc

        producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            acks="all",
            enable_idempotence=True,
        )
        await producer.start()
        try:
            payload = json.dumps(
                event.model_dump(mode="json"),
                ensure_ascii=False,
            ).encode("utf-8")
            await producer.send_and_wait(settings.KAFKA_MESSAGE_TOPIC, payload)
        finally:
            await producer.stop()


def get_event_publisher() -> EventPublisher:
    if settings.KAFKA_ENABLED:
        return KafkaEventPublisher()
    return LoggingEventPublisher()
