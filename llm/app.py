import streamlit as st
import requests
import os
from dotenv import load_dotenv
from prompts import system_prompt, filecheck_prompt, extraction_prompt_json, json_schema
from utils import ask_rchat,start_over
from sidebar import sidebar
import time
import json
import jsonschema

load_dotenv()

# st.html("parsEPD")

st.set_page_config(page_title="Digitize your EPD", layout="wide")
st.title("parsEPD: Digitize your EPD")
st.caption('''parsEPD converts an EPD from PDF or HTML format to a standardized, machine-readable JSON format (openEPD) using a large language model (LLM) for the parsing and conversion. For details about the process, please see the ParsEPD User Guide.
            \nSteps to Use ParsEPD: 
            \n- Upload your PDF formatted EPD – ParsEPD automatically  
            \n- Watch as parsEPD validates that the PDF is an EPD, identifies its product category, and creates the openEPD file.
            \n- View the openEPD file in the chat.
            \n- Download the openEPD File using the “Download openEPD File” button and/or ask question(s) about the EPD using the LLM chat.
            \nThe user can remove or replace the EPD as well as start over using options provided in left hand column. Only the most recent uploaded EPD is available for conversion.''')

# initialize session state variables
if "show_confirm" not in st.session_state:
    st.session_state.show_confirm = False

if "messages" not in st.session_state:
    st.session_state.messages = []

if "context" not in st.session_state:
    st.session_state.context = ""

if "last_file_name" not in st.session_state:
    st.session_state.last_file_name = ""

if "check_reply" not in st.session_state:
    st.session_state.check_reply = ""

uploaded_file = sidebar()

def confirm_start_over():
    st.session_state.show_confirm = True
    # start_over()

if not st.session_state.show_confirm:
    st.sidebar.button("🔄 Start Over", key="start_over", on_click=confirm_start_over)
else:
    st.sidebar.warning("Starting over will clear the chat. Are you sure you want to proceed?")
    col1, col2 = st.sidebar.columns(2)
    with col1:
        if st.button("Yes, Start Over"):
            st.session_state.show_confirm = False  # Reset session state
            uploaded_file = None  # Reset uploaded file
            start_over()
    with col2:
        if st.button("Cancel"):
            st.session_state.show_confirm = False


# st.sidebar.button("🔄 Start Over", key="start_over", on_click=lambda: start_over())

# if uploaded_file:
#     st.sidebar.success(f"Uploaded: {uploaded_file.name}")
#     # "markdown" not in st.session_state or
#     if uploaded_file.name != st.session_state.last_file_name:
#         st.session_state.last_file_name = uploaded_file.name
#         st.session_state.messages = []
#         st.session_state.check_reply = None
#         st.session_state.context = ""
#         st.session_state.markdown = None
#         check_messages = []
    
#     # Extract markdown from the uploaded file
#     if st.session_state.markdown is None:
#         with st.spinner("📝 Extracting markdown from EPD..."):
#             try:
#                 response = requests.post(os.environ.get("API_URL") + "/upload_epd/", files={"file": uploaded_file})
#                 if response.ok:
#                     markdown = response.json().get("content", "")
#                     st.session_state.markdown = markdown
#                     st.session_state.context = markdown
#                     st.session_state.messages.append({
#                         "role": "system",
#                         "content":"✅ Markdown extracted successfully."})
#                     st.session_state.messages.append({
#                         "role": "system",
#                         "content":"Verifying if document is an EPD."})
#                 else:
#                     st.sidebar.error(f"Error: {response.json().get('error', 'Unknown error')}")
#             except Exception as e:
#                 st.sidebar.error(f"Error extracting markdown: {e}")
#                 # st.stop()

#                 # Step 1: Ask LLM if the document is an EPD
#             if st.session_state.check_reply is None and st.session_state.markdown:
#                 check_messages = [
#                     {"role": "system", "content": filecheck_prompt},
#                     {"role": "system", "content": markdown}
#                 ]
#                 with st.spinner("Checking document type..."):
#                     check_reply = ask_rchat(check_messages)
#                     # st.session_state.check_reply = check_reply
#                     st.session_state.messages.append({
#                         "role": "assistant",
#                         "content": f"EPD Validity Check: {check_reply}"
#                     })
#                 st.session_state.check_reply = check_reply
#                 print(st.session_state.check_reply)
#             if check_reply and "VALID EPD" in check_reply:
#                 messages_for_llm = [
#                     {"role": "system", "content": system_prompt},
#                     {"role": "system", "content": st.session_state.context}
#                     ] + [
#                         {"role": m["role"], "content": m["content"]} for m in st.session_state.messages if m["role"] in {"user", "assistant"}
#                     ]
                
#                 with st.spinner("Waiting for LLM to process the document..."):
#                     llm_response = ask_rchat(messages_for_llm)

#                 # 💬 Add system context + LLM reply to the chat history
#                 st.session_state.messages.append({
#                     "role": "system",
#                     "content": "✅ File processed. EPD validated."
#                 })
#                 st.session_state.messages.append({
#                     "role": "assistant",
#                     "content": llm_response
#                 })
#             else:
#                 st.session_state.messages.append({
#                     "role": "assistant",
#                     "content": "❌ The uploaded document is not identified as an EPD. Please upload a valid EPD."
#                 })
#                 st.sidebar.error(" ❌ Invalid EPD. The uploaded document is not identified as an EPD.")

#                 # user_input = st.chat_input("Ask a question about your EPD")
#             if st.session_state.get("check_reply") and "VALID EPD" in st.session_state.check_reply.upper():
#                 with st.spinner("Generating openEPD format..."):
#                     openepd = ask_rchat([
#                         {"role": "system", "content": extraction_prompt_json + "\n" + json_schema},
#                     ])
#                 st.session_state.messages.append({
#                     "role": "assistant",
#                     "content": openepd
#                 })


if uploaded_file:
    st.sidebar.success(f"Uploaded: {uploaded_file.name}")

    if "last_file_name" not in st.session_state or uploaded_file.name != st.session_state.last_file_name:
        st.session_state.last_file_name = uploaded_file.name
        st.session_state.messages = []
        st.session_state.check_reply = None
        st.session_state.context = ""
        st.session_state.markdown = None

    # Step 1: Extract markdown from uploaded EPD
    if st.session_state.markdown is None:
        with st.spinner("📝 Extracting markdown from EPD..."):
            time.sleep(1)  # Simulate processing time
            try:
                response = requests.post(
                    os.environ.get("API_URL") + "/upload_epd/",
                    files={"file": uploaded_file}
                )
                if response.ok:
                    markdown = response.json().get("content", "")
                    st.session_state.markdown = markdown
                    st.session_state.context = markdown
                    st.session_state.messages.append({"role": "system", "content": "✅ Markdown extracted successfully."})
                    st.session_state.messages.append({"role": "system", "content": "Verifying if document is an EPD."})
                else:
                    st.sidebar.error(f"Error: {response.json().get('error', 'Unknown error')}")
            except Exception as e:
                st.sidebar.error(f"Error extracting markdown: {e}")
                st.stop()

    # Step 2: Ask LLM if the document is an EPD
    if st.session_state.check_reply is None and st.session_state.markdown:
        check_messages = [
            {"role": "system", "content": filecheck_prompt},
            {"role": "system", "content": st.session_state.markdown}
        ]
        with st.spinner("Checking document type..."):
            check_reply = ask_rchat(check_messages)
        st.session_state.check_reply = check_reply
        st.session_state.messages.append({
            "role": "assistant",
            "content": f"EPD Validity Check: {check_reply}"
        })
        with st.chat_message("assistant"):
            st.markdown(check_reply)

    # Step 3: Handle valid vs invalid EPD
    if st.session_state.check_reply and "VALID EPD" in st.session_state.check_reply.upper():
        messages_for_llm = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": st.session_state.context}
        ] + [
            {"role": m["role"], "content": m["content"]} for m in st.session_state.messages if m["role"] in {"user", "assistant"}
        ]

        with st.spinner("Waiting for LLM to process the document..."):
            llm_response = ask_rchat(messages_for_llm)

        with st.chat_message("assistant"):
            st.success("✅ File processed. EPD validated.")
        # st.session_state.messages.append({
        #     "role": "assistant",
        #     "content": llm_response
        # })
        st.session_state.messages.append({
            "role": "assistant",
            "content": llm_response
        })
        # with st.chat_message("assistant"):
        #     st.markdown(llm_response)

        # Step 4: Generate openEPD JSON
        with st.spinner("Generating openEPD format..."):
            openepd = ask_rchat([
                {"role": "system", "content": "The EPD is " + st.session_state.markdown + "\n" + extraction_prompt_json}
            ])
        st.session_state.messages.append({
            "role": "assistant",
            "content": openepd
        })

        try:
            # Load and validate
            with open('openepd_validation_schema.json', 'r') as file:
                openepd_schema = json.load(file)
            parsed_json = json.loads(openepd)
            jsonschema.validate(instance=parsed_json, schema=openepd_schema)
            validation_status = "✅ JSON is valid according to the schema."
            validation_color = "green"
        except jsonschema.exceptions.ValidationError as e:
            validation_status = f"❌ JSON is invalid: {e.message}"
            validation_color = "red"

        pretty_openepd = json.dumps(parsed_json, indent=4)

        with st.chat_message("assistant"):
            st.success("✅ openEPD format generated successfully.")
            st.markdown("Extend the expander below to view the full openEPD format.")
            with st.expander("openEPD Format", expanded = False):
                st.code(pretty_openepd, height=1000)
                st.markdown(f"<span style='color:{validation_color}'>{validation_status}</span>", unsafe_allow_html=True)
                st.download_button("⬇️ Download JSON", openepd, file_name="openepd.json", mime="application/json")

    else:
        st.session_state.messages.append({
            "role": "assistant",
            "content": "❌ The uploaded document is not identified as an EPD. Please upload a valid EPD."
        })
        st.sidebar.error("❌ Invalid EPD. The uploaded document is not identified as an EPD.")
