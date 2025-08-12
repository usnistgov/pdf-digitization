import os
import fitz
from markdownify import markdownify as md
from typing import Optional
import openai
import httpx
from dotenv import load_dotenv
import streamlit as st
import re

load_dotenv()

def caption():
    return '''parsEPD converts an EPD from PDF or HTML format to a standardized, machine-readable JSON format (openEPD) using a large language model (LLM) for the parsing and conversion. For details about the process, please see the ParsEPD User Guide.
            \nSteps to Use ParsEPD: 
            \n- Upload your PDF formatted EPD – ParsEPD automatically  
            \n- Watch as parsEPD validates that the PDF is an EPD, identifies its product category, and creates the openEPD file.
            \n- View the openEPD file in the chat.
            \n- Download the openEPD File using the “Download openEPD File” button and/or ask question(s) about the EPD using the LLM chat.
            \nThe user can remove or replace the EPD as well as start over using options provided in left hand column. Only the most recent uploaded EPD is available for conversion.'''

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
            temperature=0,
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
    print("star over called")
    st.session_state.clear()
    st.session_state.show_confirm = False
    st.session_state.messages = []
    st.session_state.context = ""
    st.session_state.last_file_name = ""
    st.session_state.check_reply = ""
    st.session_state.markdown = None
    uploaded_file = None
    print(st.session_state)
    return uploaded_file

def extract_first_json(text: str) -> str:
    # Remove markdown fences if present
    if text.strip().startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9]*\n?", "", text.strip())
        text = re.sub(r"\n?```$", "", text.strip())

    # Find the first JSON object using regex
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0).strip()
    else:
        return text.strip()  # Return the original text if no JSON found
    
def sanitize_string(s: str) -> str:
    """Remove non-printable characters from strings."""
    return re.sub(r"[^\x20-\x7E]", "", s)

def sanitize_json(data):
    """Recursively sanitize all string values in JSON."""
    if isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_json(v) for v in data]
    elif isinstance(data, str):
        return sanitize_string(data)
    return data