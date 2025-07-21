import os
from fastapi import FastAPI, File,UploadFile
from uuid import uuid4
from utils import pdf_to_markdown, html_to_markdown

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload_epd/")
async def upload_epd(file: UploadFile = File(...)):
    """
    Upload a PDF file and convert it to Markdown.
    
    Args:
        file (UploadFile): The PDF file to upload.
        
    Returns:
        dict: A dictionary containing the filename and the converted Markdown content.
    """
    allowed_filetypes = ('.pdf', '.htm', '.html')
    if not file.filename.endswith(allowed_filetypes):
        return {"error": "Only PDF or HTML files are allowed."}
    
    file_id = str(uuid4())
    type = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{type}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    try:
        if type.lower() == '.pdf':
            markdown_content = pdf_to_markdown(file_path)
        elif type.lower() in ['.htm', '.html']:
            markdown_content = html_to_markdown(file_path)
    except Exception as e:
        return {"error": "Unsupported file type."}
    except Exception as e:
        return JSONResponse(status_code=500, contact={"error": str(e)})
    finally:
        os.remove(file_path)
    
    return {
        "content": markdown_content
    }

