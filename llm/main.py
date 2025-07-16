import os
from fastapi import FastAPI, File,UploadFile
from uuid import uuid4
from utils import pdf_to_markdown

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file and convert it to Markdown.
    
    Args:
        file (UploadFile): The PDF file to upload.
        
    Returns:
        dict: A dictionary containing the filename and the converted Markdown content.
    """
    if not file.filename.endswith('.pdf'):
        return {"error": "Only PDF files are allowed."}
    
    file_id = str(uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    try:
        markdown_content = pdf_to_markdown(file_path)
    except Exception as e:
        return JSONResponse(status_code=500, contact={"error": str(e)})
    finally:
        os.remove(file_path)
    
    return {
        "content": markdown_content
    }