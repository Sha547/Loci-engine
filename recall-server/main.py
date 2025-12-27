from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from supabase import create_client, Client
import shutil
import os
import uuid
import json
import numpy as np
from PIL import Image
from sentence_transformers import SentenceTransformer 

SUPABASE_URL = "https://oeoregtrowjcebmwzcuf.supabase.co"
# 👇 USE THE SERVICE_ROLE KEY HERE (The 'God Mode' Key)
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lb3JlZ3Ryb3dqY2VibXd6Y3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgyMDM0NCwiZXhwIjoyMDgxMzk2MzQ0fQ.jnA8K6EO7PPz9DLxaJ9JRtlAJpeSR9jVhdevU71LSwY"

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error connecting to Supabase: {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolov8n.pt")
# Load CLIP Model (Downloads on first run)
clip_model = SentenceTransformer('clip-ViT-B-32')
EMBEDDINGS_FILE = "embeddings.json"

def load_embeddings():
    if os.path.exists(EMBEDDINGS_FILE):
        with open(EMBEDDINGS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_embedding(url, embedding):
    data = load_embeddings()
    data[url] = embedding
    with open(EMBEDDINGS_FILE, "w") as f:
        json.dump(data, f) 

@app.post("/scan")
async def scan_image(
    file: UploadFile = File(...), 
    user_id: str = Form(...), 
    location: str = Form(...),
    manual_tags: str = Form(...)
):
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_filename = f"temp_{unique_filename}"

    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # AI Detection
    results = model(temp_filename)
    detected_tags = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0]) 
            detected_tags.append(model.names[class_id].lower())
    
    # Process Manual Tags
    user_tags_list = [t.strip().lower() for t in manual_tags.split(",") if t.strip()]
    
    # Combine Tags (User tags prioritized + AI tags, unique)
    combined_tags = list(set(user_tags_list + detected_tags))

    try:
        # Upload to Storage
        with open(temp_filename, "rb") as f:
            supabase.storage.from_("scans").upload(unique_filename, f)

        # Get URL
        project_id = SUPABASE_URL.split("//")[1].split(".")[0]
        public_url = f"https://{project_id}.supabase.co/storage/v1/object/public/scans/{unique_filename}"

        # Save to Database
        data = { 
            "image_url": public_url, 
            "tags": combined_tags, 
            "user_id": user_id,
            "location": location
        }
        supabase.table("memories").insert(data).execute()
        
        # --- GENERATE & SAVE EMBEDDING (CLIP) ---
        try:
            # Open image for CLIP
            img = Image.open(temp_filename)
            embedding = clip_model.encode(img).tolist()
            save_embedding(public_url, embedding)
            print(f"Saved embedding for {public_url}")
        except Exception as e:
            print(f"CLIP Embedding Failed: {e}")

        status = "saved"
    except Exception as e:
        print(f"Upload failed: {e}")
        status = "failed"
        public_url = ""
        combined_tags = []

    if os.path.exists(temp_filename):
        os.remove(temp_filename)

    return {"status": status, "tags": combined_tags, "url": public_url}

@app.get("/memories")
def get_memories(user_id: str):
    try:
        response = supabase.table("memories").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        print(f"Fetch Error: {e}")
        return []

@app.get("/search")
def search_memories(q: str, user_id: str):
    try:
        # 1. Get all user memories from DB
        response = supabase.table("memories").select("*").eq("user_id", user_id).execute()
        user_memories = response.data # List of dicts
        
        if not user_memories:
            return []

        # 2. Get Embeddings
        embeddings_map = load_embeddings()
        
        # 3. Generate Query Embedding
        query_embedding = clip_model.encode(q)
        
        scored_results = []
        
        for item in user_memories:
            url = item['image_url']
            
            # Calculate Score
            score = 0
            
            # A. Tag Match (Exact string match bonus)
            if any(q.lower() in t.lower() for t in item['tags']):
                score += 0.5 # Bonus for manual tags
                
            # B. Semantic Match (CLIP)
            if url in embeddings_map:
                img_emb = np.array(embeddings_map[url])
                # Cosine Similarity
                cosine_sim = np.dot(query_embedding, img_emb) / (np.linalg.norm(query_embedding) * np.linalg.norm(img_emb))
                score += cosine_sim
            
            if score > 0.26: # Threshold (Increased to reduce noise)
                scored_results.append({**item, "score": score})
        
        # Sort by score descending
        scored_results.sort(key=lambda x: x['score'], reverse=True)
        
        return scored_results

    except Exception as e:
        print(f"Search Error: {e}")
        return []

@app.delete("/memories/{memory_id}")
def delete_memory(memory_id: str):
    try:
        # Delete from DB
        supabase.table("memories").delete().eq("id", memory_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        print(f"Delete Error: {e}")
        return {"status": "failed", "error": str(e)}

@app.put("/memories/{memory_id}")
def update_memory(memory_id: str, location: str = Form(...), manual_tags: str = Form(...)):
    try:
        # Process Tags
        tags_list = [t.strip().lower() for t in manual_tags.split(",") if t.strip()]
        
        data = {
            "location": location,
            "tags": tags_list
        }
        
        supabase.table("memories").update(data).eq("id", memory_id).execute()
        return {"status": "updated", "data": data}
    except Exception as e:
        print(f"Update Error: {e}")
        return {"status": "failed", "error": str(e)}

@app.post("/reindex")
def reindex_memories():
    try:
        # 1. Fetch all memories
        response = supabase.table("memories").select("*").execute()
        memories = response.data
        
        embeddings_map = load_embeddings()
        updated_count = 0
        
        import requests
        from io import BytesIO

        for item in memories:
            url = item['image_url']
            if url not in embeddings_map:
                print(f"Generating embedding for {url}...")
                try:
                    # Download image
                    res = requests.get(url)
                    if res.status_code == 200:
                        img = Image.open(BytesIO(res.content))
                        embedding = clip_model.encode(img).tolist()
                        embeddings_map[url] = embedding
                        updated_count += 1
                except Exception as e:
                    print(f"Failed to process {url}: {e}")
        
        # Save all at once
        with open(EMBEDDINGS_FILE, "w") as f:
            json.dump(embeddings_map, f)
            
        return {"status": "success", "updated": updated_count}
    except Exception as e:
        return {"status": "failed", "error": str(e)}