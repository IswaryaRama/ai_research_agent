from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from database import get_db
from services.agents import debate_system
from services.rag import search_similar_chunks
import json

router = APIRouter()

# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, db: Session = Depends(get_db)):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            query = message_data.get("query", "")
            
            # Step 1: Human-in-the-loop check (stubbed for Web Search)
            if "latest" in query.lower() or "news" in query.lower():
                await manager.send_personal_message(json.dumps({
                    "type": "approval_request",
                    "tool": "Web Search",
                    "reason": "Query asks for recent information."
                }), websocket)
                
                # Wait for approval response
                approval_data = await websocket.receive_text()
                approval = json.loads(approval_data)
                
                if not approval.get("approved"):
                    await manager.send_personal_message(json.dumps({
                        "type": "message",
                        "content": "Web search cancelled. Answering from local knowledge only."
                    }), websocket)
            
            # Step 2: Retrieve from RAG
            chunks = search_similar_chunks(db, query, top_k=3)
            context = "\n".join([c.chunk_text for c in chunks]) if chunks else "No relevant context found in documents."
            
            # Step 3: Run Debate System
            try:
                await manager.send_personal_message(json.dumps({"type": "status", "content": "Agents are debating..."}), websocket)
                
                result = debate_system.run_debate(query, context)
                
                # Send the final answer along with the debate transcript
                await manager.send_personal_message(json.dumps({
                    "type": "final_answer",
                    "content": result["final_answer"],
                    "transcript": result["transcript"],
                    "sources": [{"chunk_id": c.id, "preview": c.chunk_text[:100]} for c in chunks]
                }), websocket)
                
            except Exception as e:
                await manager.send_personal_message(json.dumps({"type": "error", "content": str(e)}), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
