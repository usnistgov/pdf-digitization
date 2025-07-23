import os
import fitz
from markdownify import markdownify as md
from typing import Optional
import openai
import httpx
from dotenv import load_dotenv
import streamlit as st

load_dotenv()

test_client = openai.OpenAI(
    base_url=os.environ.get("URL"),
    api_key=os.environ.get("RCHAT_API_KEY"),
    http_client=httpx.Client(verify=False)
)


def ask_rchat(messages): 
    """
    Function to send messages to the RChat API and get a response.
    """
    response = test_client.chat.completions.create(
            model=os.environ.get("MODEL"),
            max_tokens=4096,
            temperature=0.7,
            top_p=0.95,
            stream=False,
            messages=messages
        )
    return response.choices[0].message.content

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

def html_to_markdown(file_path:str,output_path:Optional[str] = None) -> str:
    """
    Convert HTML file to Markdown format.
    
    Args:
        file_path (str): Path to the HTML file.
        output_path (Optional[str]): Path to save the converted Markdown file.
        
    Returns:
        str: Converted Markdown text.
    """
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return ""
    
    with open(file_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    
    markdown_text = md(html_content, heading_style="ATX")
    
    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(markdown_text)
    return markdown_text

def start_over():
    st.session_state.clear()
    uploaded_file = None
    return uploaded_file