import os
from sqlalchemy.orm import Session
from models import Document, DocumentChunk
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
import pytesseract
from pdf2image import convert_from_path
import chromadb

# Load the embedding model locally
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize ChromaDB client
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="document_chunks")

def process_document(db: Session, document_id: int):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return
        
    extracted_text = ""
    # Very basic routing: if it's a PDF, try to extract via OCR
    if doc.filepath.lower().endswith('.pdf'):
        try:
            pages = convert_from_path(doc.filepath)
            for page_num, page_img in enumerate(pages):
                text = pytesseract.image_to_string(page_img)
                extracted_text += f"\n--- Page {page_num + 1} ---\n{text}"
        except Exception as e:
            print(f"Error processing PDF {doc.filepath}: {e}")
            return
    elif doc.filepath.lower().endswith(('.png', '.jpg', '.jpeg')):
        try:
            extracted_text = pytesseract.image_to_string(doc.filepath)
        except Exception as e:
            print(f"Error processing Image {doc.filepath}: {e}")
            return
    else:
        # Assuming plain text
        try:
            with open(doc.filepath, 'r', encoding='utf-8') as f:
                extracted_text = f.read()
        except Exception as e:
            print(f"Error reading text file {doc.filepath}: {e}")
            return
            
    if not extracted_text.strip():
        return
        
    # Chunking using Langchain
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    
    chunks = text_splitter.split_text(extracted_text)
    
    # Generate embeddings and store
    db_chunks = []
    for idx, chunk_text in enumerate(chunks):
        db_chunk = DocumentChunk(
            document_id=doc.id,
            chunk_text=chunk_text,
            page_number=1 
        )
        db.add(db_chunk)
        db_chunks.append(db_chunk)
        
    db.commit()
    
    for chunk in db_chunks:
        db.refresh(chunk)
        
    # Batch add to ChromaDB
    if db_chunks:
        collection.add(
            embeddings=[embedding_model.encode(c.chunk_text).tolist() for c in db_chunks],
            documents=[c.chunk_text for c in db_chunks],
            metadatas=[{"document_id": doc.id, "page_number": c.page_number} for c in db_chunks],
            ids=[str(c.id) for c in db_chunks]
        )
        
    print(f"Successfully processed and stored embeddings for document {doc.id}")

def search_similar_chunks(db: Session, query: str, top_k: int = 5):
    query_embedding = embedding_model.encode(query).tolist()
    
    # Query ChromaDB for similar chunks
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    
    if not results['ids'] or not results['ids'][0]:
        return []
        
    # Get the SQLite DocumentChunk IDs
    chunk_ids = [int(i) for i in results['ids'][0]]
    
    # Retrieve the corresponding objects from SQLite
    chunks = db.query(DocumentChunk).filter(DocumentChunk.id.in_(chunk_ids)).all()
    
    # Return chunks in the order provided by ChromaDB
    ordered_chunks = []
    for cid in chunk_ids:
        for c in chunks:
            if c.id == cid:
                ordered_chunks.append(c)
                break
                
    return ordered_chunks
