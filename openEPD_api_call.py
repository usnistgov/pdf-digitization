import os
import requests

url = "https://buildingtransparency.org/api/epds?pcr_series=333b023a3bf049d8b48ef33105d43374&pcr_series=fe4cde72c04b4d759d0de1472e028b6a"


# Ensure you have set the environment variable BUILDING_TRANSPARENCY_API_KEY
# BUILDING_TRANSPARENCY_API_KEY=your_api_key_here

headers = {
    "Authorization": "Bearer " + os.environ.get("BUILDING_TRANSPARENCY_API_KEY", "")
}

params = {
    "category": "0d1d4544c70f4a82938c79d88f86ec5d",
    "page_size": 250,
    "plant_geography": "US",
    "date_validity_ends__gt": "2024-07-17"
}

response = requests.get(url, headers=headers,params=params)

if response.ok:
    print(response.text)
else:
    print(response.status_code, response.text)