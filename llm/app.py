import streamlit as st
import requests
import os
from dotenv import load_dotenv
from prompts import system_prompt, context_prompt
import openai
import httpx

load_dotenv()

print(os.environ.get("RCHAT_API_KEY") or 'sk-410cd2b0a4b6471cb2504d5a4a49f4fa')

test_client = openai.OpenAI(
    base_url=os.environ.get("URL"),
    api_key='sk-410cd2b0a4b6471cb2504d5a4a49f4fa',
    http_client=httpx.Client(verify=False)
)

st.set_page_config(page_title="Digitize your EPD with LLMs", layout="wide")
st.title("Digitize your EPD with LLMs")

if "messages" not in st.session_state:
    st.session_state.messages = []

if "context" not in st.session_state:
    st.session_state.context = ""

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
    print(response)
    return response.choices[0].message.content

st.sidebar.header("Upload EPD")
uploaded_file = st.sidebar.file_uploader("Upload your EPD file (PDF)", type=["pdf"])

if uploaded_file:
    st.sidebar.success(f"Uploaded: {uploaded_file.name}")
    with st.spinner("Extracting markdown..."):
        try:
            response = requests.post(os.environ.get("API_URL",'http://localhost:8000') + "/upload_pdf/", files={"file": uploaded_file})
            if response.ok:
                markdown = response.json().get("content", "")
                st.session_state.context = markdown
                st.sidebar.success("Markdown extracted successfully. Sending to LLM")

                messages_for_llm = [
                    {"role": "system", "content": system_prompt},
                    {"role": "system", "content": st.session_state.context}
                    ] + [
                        {"role": m["role"], "content": m["content"]} for m in st.session_state.messages if m["role"] in {"user", "assistant"}
                    ]
                
                st.session_state.messages.insert(0, {
                    "role": "system",
                    "content": f"✅ **PDF content extracted and used as context:**\n\n```\n{markdown[:3000]}\n```"
                })

                st.session_state.messages.insert(1, {
                    "role": "system",
                    "content": f"{system_prompt}\n"
                })
                
                with st.spinner("Waiting for LLM to process the document..."):
                    llm_response = ask_rchat(messages_for_llm)
                    print(f"LLM response: {llm_response}")

                # 💬 Add system context + LLM reply to the chat history
                st.session_state.messages.append({
                    "role": "system",
                    "content": "✅ PDF processed. Context has been injected."
                })
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": llm_response
                })

                
            else:
                st.sidebar.error(f"Error: {response.json().get('error', 'Unknown error')}")
        except Exception as e:
            st.sidebar.error(f"{e}")   

# System message
st.chat_message("system").markdown("You're chatting with an LLM. Uploaded EPD content will be used as context.")

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