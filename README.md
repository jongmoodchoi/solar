# solar

Solar System Simulation (Flask + Three.js).

## Run locally

```powershell
C:/Users/jongm/AppData/Local/Microsoft/WindowsApps/python3.8.exe -m pip install -r requirements.txt
C:/Users/jongm/AppData/Local/Microsoft/WindowsApps/python3.8.exe app.py
```

Open: http://127.0.0.1:5000/

## Run tests

```powershell
C:/Users/jongm/AppData/Local/Microsoft/WindowsApps/python3.8.exe -m pytest -q
```

## Deploy to Google Cloud Run (low ongoing cost)

This repo includes a `Dockerfile` for Cloud Run.

High level steps:

1) Install and authenticate the gcloud CLI.
2) Create/select a GCP project and enable required APIs.
3) Deploy:

```powershell
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

gcloud run deploy solar-sim \
	--source . \
	--region us-central1 \
	--allow-unauthenticated \
	--min-instances 0 \
	--memory 256Mi \
	--cpu 1
```

Note: Pricing/free-tier details can change; check current Cloud Run pricing in the GCP console.
