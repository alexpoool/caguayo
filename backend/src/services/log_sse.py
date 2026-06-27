import asyncio
from typing import Dict, List
from fastapi import APIRouter

router = APIRouter(prefix="/logs", tags=["logs"])

# In-memory storage for connected SSE clients
_sse_clients: Dict[str, List[asyncio.Queue]] = {}


async def sse_events(request_id: str = "default"):
    """Server-Sent Events stream for real-time logs"""
    queue = asyncio.Queue()

    if request_id not in _sse_clients:
        _sse_clients[request_id] = []
    _sse_clients[request_id].append(queue)

    try:
        while True:
            # Wait for new event
            event = await queue.get()
            yield f"data: {event}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        if request_id in _sse_clients:
            _sse_clients[request_id].remove(queue)


async def broadcast_log(log_data: dict):
    """Broadcast a new log to all connected SSE clients"""
    import json

    event_data = json.dumps(log_data)

    for request_id, queues in _sse_clients.items():
        for queue in queues:
            try:
                await queue.put(event_data)
            except Exception:
                pass
