import streamlit as st
import requests
import os
from dotenv import load_dotenv
from prompts import system_prompt, filecheck_prompt
from utils import ask_rchat,start_over
# import json
from sidebar import sidebar
# import openai
# import httpx

load_dotenv()

st.set_page_config(page_title="Digitize your EPD with LLMs", layout="wide")
st.title("ParsEPD: Digitize your EPD")
st.caption('''ParsEPD converts EPDs from PDF format to a standardized, machine-readable JSON format (OpenEPD+hyperlink). Users can download the OpenEPD file as well as query the information in the EPD.
            ParsEPD uses a large language model (LLM) for the parsing, conversion, and querying the information. For details about the process, please see the ParsEPD User Guide or the provided chatbot.
            \nSteps to Use ParsEPD: 
            \n- Upload your PDF formatted EPD – ParsEPD automatically  
            \n- Watch as ParsEPD validates that the PDF is an EPD, identifies, its product category, and creates the OpenEPD file.
            \n- Download the OpenEPD File using the “Download OpenEPD File” button and/or ask question(s) about the EPD using the LLM chat.
            \nThe user can remove or replace the EPD as well as start over using options provided in left hand column. Only the most recent uploaded EPD is available for conversion and querying.''')

if "messages" not in st.session_state:
    st.session_state.messages = []

if "context" not in st.session_state:
    st.session_state.context = ""

if "last_file_name" not in st.session_state:
    st.session_state.last_file_name = ""

if "check_reply" not in st.session_state:
    st.session_state.check_reply = ""

# option = st.checkbox('Do you want the OpenEPD format for this EPD?')
# 'You selected:', option

uploaded_file = sidebar()
st.sidebar.button("Start Over", key="start_over", on_click=lambda: start_over())

if uploaded_file:
    if uploaded_file.name != st.session_state.last_file_name:
        st.session_state.last_file_name = uploaded_file.name
        st.session_state.messages = []
        st.session_state.check_reply = None
        check_messages = []
    st.sidebar.success(f"Uploaded: {uploaded_file.name}")
    with st.spinner("Extracting markdown..."):
        try:
            response = requests.post(os.environ.get("API_URL","http://localhost:8000") + "/upload_epd/", files={"file": uploaded_file})
            if response.ok:
                markdown = response.json().get("content", "")
                st.session_state.context = markdown
                st.session_state.messages.append({
                    "role": "system",
                    "content":"Markdown extracted successfully.Verifying if document is an EPD..."})

                # Step 1: Ask LLM if the document is an EPD
                check_messages = [
                    {"role": "system", "content": filecheck_prompt},
                    {"role": "system", "content": markdown}
                ]
                # if st.session_state.check_reply is None:
                with st.spinner("Checking document type..."):
                    check_reply = ask_rchat(check_messages)
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": f"EPD Validity Check: {check_reply}"
                    })
                if st.session_state.check_reply is None:
                    with st.spinner("Checking document type..."):
                        check_reply = ask_rchat(check_messages)
                        st.session_state.check_reply = check_reply
                else:
                    check_reply = st.session_state.check_reply
                

                if "VALID EPD" in check_reply:

                    messages_for_llm = [
                        {"role": "system", "content": system_prompt},
                        {"role": "system", "content": st.session_state.context}
                        ] + [
                            {"role": m["role"], "content": m["content"]} for m in st.session_state.messages if m["role"] in {"user", "assistant"}
                        ]
                    
                    st.session_state.messages.insert(0, {
                        "role": "system",
                        "content": f"✅ **File content extracted:**"
                    })
                    
                    with st.spinner("Waiting for LLM to process the document..."):
                        llm_response = ask_rchat(messages_for_llm)

                    # 💬 Add system context + LLM reply to the chat history
                    st.session_state.messages.append({
                        "role": "system",
                        "content": "✅ File processed."
                    })
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": llm_response
                    })
                else:
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": "❌ The uploaded document is not identified as an EPD. Please upload a valid EPD PDF."
                    })
                    st.sidebar.error("The uploaded document is not identified as an EPD. Please upload a valid EPD PDF.")
            
                
            else:
                st.sidebar.error(f"Error: {response.json().get('error', 'Unknown error')}")
        except Exception as e:
            st.sidebar.error(f"{e}")   

# System message
st.chat_message("system").markdown("You're chatting with an LLM. Uploaded EPD will be used.")

for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

user_input = st.chat_input("Ask a question about your EPD")

if user_input:
    # Add user message
    st.session_state.messages.append({"role": "user", "content": user_input})
    st.chat_message("user").markdown(user_input)

    # Combine context + user question
    prompt = f"{st.session_state.context}\n\nUser: {user_input}"
    messages_for_llm = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": st.session_state.context}
    ] + [
        {"role": m["role"], "content": m["content"]} for m in st.session_state.messages if m["role"] in {"user", "assistant"}
    ]

    # Simulated LLM response — replace this with actual LLM call
    with st.spinner("Thinking..."):
        try:
            reply = ask_rchat(messages_for_llm)
        except Exception as e:
            reply = f"⚠️ Error from OpenAI: {e}"

    st.session_state.messages.append({"role": "assistant", "content": reply})
    st.chat_message("assistant").markdown(reply)

    
    # json_candidate = json.loads(reply)
    # st.download_button(
    #     label="📥 Download LLM Response as JSON",
    #     data=json.dumps(json_candidate, indent=2),
    #     file_name="epd_output.json",
    #     mime="application/json"
    # )
    st.download_button(
        label="Download JSON",
        data=reply,
        file_name="llm_response.txt",
        mime="text/plain"
    )        