import streamlit as st

def sidebar():
   
    st.sidebar.title("parsEPD: Digitize your EPD")
    st.sidebar.caption("Please upload your Environmental Product Declaration (EPD) PDF file here. The system will extract, analyze its content and provide you with the openEPD JSON.")

    # st.sidebar.markdown(
    # """
    # <div style="display: flex; align-items: center;">
    #     <img src="llm/NIST_logo.png" style="height:40px; margin-right:10px;">
    #     <span style="font-size:1.2em; font-weight:bold;">Upload EPD</span>
    # </div>
    # <p>Please upload your Environmental Product Declaration (EPD) PDF file here. The system will extract and analyze its content using AI.</p>
    # """,
    # unsafe_allow_html=True
    # )

    st.markdown(
    """
    <style>
        /* Fix sidebar width */
        section[data-testid="stSidebar"] {
            width: 400px !important;
            min-width: 400px !important;
            max-width: 400px !important;
        }
    </style>
    """,
    unsafe_allow_html=True
)

    uploaded_file = st.sidebar.file_uploader(label="Upload your EPD file",
    type=["pdf", "htm", "html"],
    label_visibility="collapsed",
    key="uploaded_file")

    return uploaded_file
