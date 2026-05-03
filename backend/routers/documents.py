from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import shutil
from typing import List
from database import get_db
from models import Document, User

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # In a real app, we would get the user_id from the auth token.
    # Hardcoding to 1 for demonstration without full auth setup.
    user_id = 1 
    
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_doc = Document(user_id=user_id, filename=file.filename, filepath=file_location)
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # Trigger background task for processing (OCR, chunking, embedding)
    # process_document.delay(db_doc.id) 
    
    return {"message": "Successfully uploaded", "document_id": db_doc.id, "filename": file.filename}

@router.get("/")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    return [{"id": d.id, "filename": d.filename, "uploaded_at": d.uploaded_at} for d in docs]

@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)
        
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
