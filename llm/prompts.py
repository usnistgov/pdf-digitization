system_prompt='''You are a helpful assistant that can answer questions about an Environmental Product Declaration (EPD). The EPD content is provided as context. Please answer the user's questions based on the provided context.
If you don't know the answer, say 'I don't know'. If the question is not related to the EPD, politely inform the user that you can only answer questions about the EPD.'''

filecheck_prompt = '''
You are an expert in environmental declarations and standards. Your task is to strictly validate whether the following document is an Environmental Product Declaration (EPD).

Definition of an EPD:
An EPD is a standardized, third-party verified document that:
Complies with ISO 14025 and EN 15804.
References a valid Product Category Rule (PCR).
Declares a declared unit or functional unit.
Provides quantified LCIA indicators (e.g., GWP, ODP, AP).
Identifies a program operator and a verification statement.
Has a clearly defined validity period and issue date.
Important:
Do NOT classify the document as an EPD if it is:
A Life Cycle Assessment (LCA) report
A technical report (even if it contains environmental data)
A product brochure or marketing material
A sustainability or research paper
Presence of environmental data alone is not sufficient. An EPD must be a formal declaration document with explicit EPD structure and identifiers.
Task:
Respond with ' ✅VALID EPD' if the document meets EPD requirements, or '❌ NOT AN EPD' if it does not.
Then, in 1–2 sentences, explain your reasoning by citing specific indicators from the text.
'''


# '''
# You are an expert in sustainability documentation. Given the content below, determine whether the document is an Environmental Product Declaration (EPD).
# An EPD is a standardized, third-party verified document that transparently reports the environmental impact of a product throughout its life cycle, based on Product Category Rules (PCR) and conforming to ISO 14025 and EN 15804 standards. It usually includes a declaration of environmental impacts (e.g. GWP, AP, EP), a declared unit, reference PCR, manufacturer details, and a validity period.
# Do not classify documents that are solely Life Cycle Assessment (LCA) reports, sustainability reports, or internal assessments as EPDs.
# Instructions:
# Read the content carefully.
# Decide whether the document is an EPD.
# Answer only one of the following:
# "VALID EPD, this is an EPD."
# "INVALID EPD, this is not an EPD."
# Validate the the document only if it meets all the EPD requirements. Otherwise, say it is not an EPD.
# Respond with the classification and, if valid, identify the product category.
# Briefly explain your reasoning (1–2 sentences).
# '''


# '''Please validate that this document is a legitimate Environmental Product Declaration (EPD) by checking for the following required elements:\n\n
#     1. Contains environmental impact data for a specific product\n
#     2. Follows ISO 14025 or EN 15804 standards\n
#     3. Includes life cycle assessment (LCA) data\n
#     4. Has been third-party verified\n
#     5. Contains a functional unit definition\n
#     6. Includes system boundaries\n
#     7. Has a validity period\n
#     8. Contains program operator information\n\n
# Respond with 'VALID EPD' if the document meets EPD requirements, or 'NOT AN EPD' if it does not, followed by a brief explanation. If it is a valid EPD, identify the product category.'''

extraction_prompt = '''Please extract and structure the following key information from this Environmental Product Declaration (EPD) document:\n\n1. Product Information:\n   - Product name\n   - Manufacturer/Producer\n   - 
Product category\n
- Functional unit\n   - Reference service life\n\n2. Environmental Impact Categories:\n   - Global Warming Potential (GWP)\n   - Ozone Depletion Potential (ODP)\n   - Acidification Potential (AP)\n   - Eutrophication Potential (EP)\n
- Photochemical Ozone Creation Potential (POCP)\n   - Abiotic Depletion Potential (ADP)\n\n3. Life Cycle Stages:\n   - Raw material supply (A1)\n   - Transport (A2)\n   - Manufacturing (A3)\n   - Use stage impacts\n 
- End-of-life impacts\n\n4. Additional Information:\n   - Declaration number\n   - Program operator\n   - Validity period\n   - Verification status\n\nPlease present the information in a clear, structured format.
If any information is not available in the document, indicate 'Not specified'.'''

extraction_prompt_json = '''
You are an expert at extracting data from Environmental Product Declarations (EPDs) into a structured format.
Your task:
1. Read the provided EPD content carefully.
2. Extract all values into the JSON object specified below.
3. Output only the JSON object — no code fences (```), no explanations, no text before or after.
4. If any field cannot be found, set its value to the string "--".
5. Use exactly the data types given in the schema (string, number, boolean, array, object).
6. Include all fields in the output, even if they are "--".
7. Ensure the JSON is valid and can be parsed without modification.

Output Format (do not add any other text, just this JSON object):

{"id":"","doctype":"","openepd_version":"","version":0,"language":"","private":false,"declaration_url":"","lca_discussion":"","program_operator_doc_id":"","program_operator_version":"","third_party_verification_url":"","third_party_verifier_email":"","epd_developer_email":"","date_of_issue":"","valid_until":"","declared_unit":{"qty":0,"unit":""},"kg_per_declared_unit":{"qty":0,"unit":""},"kg_C_per_declared_unit":{"qty":0,"unit":""},"product_name":"","product_sku":"","product_description":"","product_image_small":"","product_image":"","product_service_life_years":0,"product_classes":{"masterformat":"","UNSPSC":["",""],"NAPCS":"","EC3":"","io.cqd.ec3":"","CN":"","oekobau.dat":"","INIES":""},"applicable_in":["","","","",""],"product_usage_description":"","product_usage_image":"","manufacturing_description":"","manufacturing_image":"","ec3":{"gwp_uncertainty_adjusted_a1a2a3_traci21":0,"gwp_uncertainty_adjusted_a1a2a3_ar5":0,"category":"","manufacturer_specific":false,"plant_specific":false,"product_specific":false,"batch_specific":false,"supply_chain_specificity":0},"ref":"","manufacturer":{"web_domain":""},"plants":[{"id":"","name":""},{"id":"","name":""}],"program_operator":{"web_domain":"","alt_ids":{"wbcsd":""},"name":"","alt_names":["",""],"ref":""},"third_party_verifier":{"web_domain":""},"epd_developer":{"web_domain":""},"pcr":{"id":"","issuer_doc_id":"","name":"","short_name":"","version":"","date_of_issue":"","valid_until":"","declared_units":[{}],"doc":"","status":"","product_classes":{"masterformat":"","UNSPSC":["",""],"NAPCS":"","EC3":"","io.cqd.ec3":"","CN":"","oekobau.dat":"","INIES":""},"ref":""},"compliance":[{"short_name":"","name":"","link":"","ref":""}],"attachments":{"datasheet":""},"alt_ids":{"wbcsd":""},"includes":[{"qty":0,"link":"","gwp_fraction":0,"evidence_type":"","citation":""}],"impacts":{"TRACI 2.1":{"gwp":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"odp":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}}}},"resource_uses":{"RPRe":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"RPRm":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"NRPRe":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"NRPRm":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"sm":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"rsf":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"nrsf":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"re":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"fw":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}}},"output_flows":{"hwd":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"nhwd":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"hlrw":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"illrw":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"cru":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"mr":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"mer":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"ee":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"eh":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}}}}

'''

json_schema = '''
the json schema is - {"id":"","doctype":"","openepd_version":"","version":0,"language":"","private":false,"declaration_url":"","lca_discussion":"","program_operator_doc_id":"","program_operator_version":"","third_party_verification_url":"","third_party_verifier_email":"","epd_developer_email":"","date_of_issue":"","valid_until":"","declared_unit":{"qty":0,"unit":""},"kg_per_declared_unit":{"qty":0,"unit":""},"kg_C_per_declared_unit":{"qty":0,"unit":""},"product_name":"","product_sku":"","product_description":"","product_image_small":"","product_image":"","product_service_life_years":0,"product_classes":{"masterformat":"","UNSPSC":["",""],"NAPCS":"","EC3":"","io.cqd.ec3":"","CN":"","oekobau.dat":"","INIES":""},"applicable_in":["","","","",""],"product_usage_description":"","product_usage_image":"","manufacturing_description":"","manufacturing_image":"","ec3":{"gwp_uncertainty_adjusted_a1a2a3_traci21":0,"gwp_uncertainty_adjusted_a1a2a3_ar5":0,"category":"","manufacturer_specific":false,"plant_specific":false,"product_specific":false,"batch_specific":false,"supply_chain_specificity":0},"ref":"","manufacturer":{"web_domain":""},"plants":[{"id":"","name":""},{"id":"","name":""}],"program_operator":{"web_domain":"","alt_ids":{"wbcsd":""},"name":"","alt_names":["",""],"ref":""},"third_party_verifier":{"web_domain":""},"epd_developer":{"web_domain":""},"pcr":{"id":"","issuer_doc_id":"","name":"","short_name":"","version":"","date_of_issue":"","valid_until":"","declared_units":[{}],"doc":"","status":"","product_classes":{"masterformat":"","UNSPSC":["",""],"NAPCS":"","EC3":"","io.cqd.ec3":"","CN":"","oekobau.dat":"","INIES":""},"ref":""},"compliance":[{"short_name":"","name":"","link":"","ref":""}],"attachments":{"datasheet":""},"alt_ids":{"wbcsd":""},"includes":[{"qty":0,"link":"","gwp_fraction":0,"evidence_type":"","citation":""}],"impacts":{"TRACI 2.1":{"gwp":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"odp":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}}}},"resource_uses":{"RPRe":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"RPRm":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"NRPRe":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"NRPRm":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"sm":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"rsf":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"nrsf":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"re":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"fw":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}}},"output_flows":{"hwd":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"nhwd":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"hlrw":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"illrw":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"cru":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"mr":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"mer":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"ee":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}},"eh":{"A1A2A3":{"mean":0,"unit":"","rsd":0,"dist":""}}}}
'''
