import os
import fitz
from markdownify import markdownify as md
from typing import Optional

def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
    """
    Extract text from a PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file.
        
    Returns:
        str: Extracted text from the PDF, or None if extraction fails.
    """
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return None
    
    try:
        text = ""
        doc = fitz.open(pdf_path)
        for page_num,page in enumerate(doc,start=1):
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None
    
def convert_text_to_markdown(text: str) -> str:
    """
    Convert plain text to Markdown format.
    
    Args:
        text (str): Input text to convert.
        
    Returns:
        str: Converted Markdown text.
    """
    if not text:
        return ""
    
    try:
        markdown_text = md(text)
        return markdown_text
    except Exception as e:
        print(f"Error converting text to Markdown: {e}")
        return text  # Return original text if conversion fails
    
def pdf_to_markdown(pdf_path:str,output_md_path: Optional[str] = None)-> str:
    raw_text = extract_text_from_pdf(pdf_path)
    markdown_text = convert_text_to_markdown(raw_text)

    if output_md_path:
        with open(output_md_path, "w", encoding="utf-8") as f:
            f.write(markdown_text)
    return markdown_text