import streamlit as st
import requests
import os
from dotenv import load_dotenv
from prompts import system_prompt, filecheck_prompt
import openai
import httpx

load_dotenv()

print(os.environ.get("RCHAT_API_KEY"))
print(os.environ.get("API_URL"))

test_client = openai.OpenAI(
    base_url=os.environ.get("URL"),
    api_key='sk-410cd2b0a4b6471cb2504d5a4a49f4fa',
    http_client=httpx.Client(verify=False)
)

st.set_page_config(page_title="Digitize your EPD with LLMs", layout="wide")
st.title("ParsEPD: Digitize your EPD with LLMs")
st.caption("Upload your Environmental Product Declaration (EPD) and get the OpenEPD format in a click!")

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
    return response.choices[0].message.content

option = st.checkbox('Do you want the OpenEPD format for this EPD?')

'You selected:', option

st.sidebar.markdown(
    """
    <div style="display: flex; align-items: center;">
        <img src="llm/NIST_logo.png" style="height:40px; margin-right:10px;">
        <span style="font-size:1.2em; font-weight:bold;">Upload EPD</span>
    </div>
    <p>Please upload your Environmental Product Declaration (EPD) PDF file here. The system will extract and analyze its content using AI.</p>
    """,
    unsafe_allow_html=True
)

uploaded_file = st.sidebar.file_uploader("", type=["pdf","htm","html"])

if uploaded_file:
    st.session_state.messages = []
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
                with st.spinner("Checking document type..."):
                    check_reply = ask_rchat(check_messages)
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": f"EPD Validity Check: {check_reply}"
                    })

                if "VALID EPD" in check_reply:
                    # st.sidebar.success("Document identified as EPD. Sending to LLM for further processing.")
                    
                    # Step 1: Ask LLM to identify the product category
                #     check_messages = [
                #     {"role": "system", "content": filecheck_prompt},
                #     {"role": "system", "content": markdown}
                # ]
                #     with st.spinner("Checking document type..."):
                #         check_reply = ask_rchat(check_messages)
                #         st.session_state.messages.append({
                #             "role": "assistant",
                #             "content": f"EPD Validity Check: {check_reply}"
                #         })

                    messages_for_llm = [
                        {"role": "system", "content": system_prompt},
                        {"role": "system", "content": st.session_state.context}
                        ] + [
                            {"role": m["role"], "content": m["content"]} for m in st.session_state.messages if m["role"] in {"user", "assistant"}
                        ]
                    
                    st.session_state.messages.insert(0, {
                        "role": "system",
                        "content": f"✅ **File content extracted and used as context:**"
                    })

                    # st.session_state.messages.insert(0, {
                    #     "role": "system",
                    #     "content": f"{system_prompt}\n"
                    # })\
                    
                    # st.session_state.messages.insert(1, {
                    #     "role": "system",
                    #     "content": f"{filecheck_prompt}\n"
                    # })
                    
                    with st.spinner("Waiting for LLM to process the document..."):
                        llm_response = ask_rchat(messages_for_llm)
                        print(f"LLM response: {llm_response}")

                    # 💬 Add system context + LLM reply to the chat history
                    st.session_state.messages.append({
                        "role": "system",
                        "content": "✅ File processed. Context has been injected."
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