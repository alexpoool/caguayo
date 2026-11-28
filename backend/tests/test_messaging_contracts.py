from src.messaging.contracts import (
    MessageChannel,
    MessageEvent,
    MessageEventType,
    MessagePayload,
)


def test_person_to_person_event_serializes():
    event = MessageEvent(
        tenant_id="caguayo_sa",
        channel=MessageChannel.PERSON_TO_PERSON,
        sender_id=1,
        recipient_id=2,
        payload=MessagePayload(text="Hola"),
    )
    data = event.model_dump(mode="json")
    assert data["event_type"] == MessageEventType.CREATED
    assert data["tenant_id"] == "caguayo_sa"
    assert data["recipient_id"] == 2
    assert data["payload"]["text"] == "Hola"


def test_person_to_agent_event_supports_agent_requested():
    event = MessageEvent(
        event_type=MessageEventType.AGENT_REQUESTED,
        tenant_id="caguayo_sa",
        channel=MessageChannel.PERSON_TO_AGENT,
        sender_id=1,
        payload=MessagePayload(text="¿Qué contratos vencen este mes?"),
    )
    assert event.recipient_id is None
    assert event.event_type == MessageEventType.AGENT_REQUESTED
