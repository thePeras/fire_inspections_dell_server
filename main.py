import os
import logging
from flask import Flask, request, jsonify
from supabase import create_client, Client
from waitress import serve
from dotenv import load_dotenv
from pathlib import Path
import shutil
import subprocess

# Setup logging
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("logs/server.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "./downloads")
BUCKET_NAME = 'reports-pdfs'

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def download_and_delete_file(file_name):
    temp_path = f"temp_{file_name}"
    try:
        # Get File Info first to check metadata
        files = supabase.storage.from_(BUCKET_NAME).list()
        file_info = next((f for f in files if f['name'] == file_name), None)
        
        if not file_info:
            logger.warning(f"File {file_name} not found in bucket. Skipping.")
            return

        # Get Metadata
        res = supabase.rpc("get_user_metadata", {"file_path": file_name}).execute()
        meta = res.data

        if not meta:
            logger.error(f"CRITICAL: No metadata returned for {file_name}. Ignoring file.")
            return
        
        # Check for a specific required key to ensure it's the right "type" of file
        if 'clientId' not in meta:
            logger.error(f"REQUIRED: 'clientId' missing in metadata for {file_name}. Ignoring.")
            return

        logger.info(f"Downloading...")

        # Download
        res = supabase.storage.from_(BUCKET_NAME).download(file_name)
        with open(temp_path, "wb") as f:
            f.write(res)

        # Grant Everyone Permission
        subprocess.run(['icacls', temp_path, '/grant', '*S-1-1-0:(F)'], check=True, capture_output=True)

        # Construct Path
        client_id = meta.get('clientId')
        type_code = meta.get('typeCode')
        est_id = meta.get('establishmentId')
        insp_name = meta.get('inspectionName')
        date_str = meta.get('dateStr')

        new_name = f"{client_id}.{type_code}.1.{est_id} relatorio de verificacao {insp_name} {date_str}.pdf"
        
        company_folder = "999_Docs" if meta.get("companySlug") == "vianafogo" else "333_Docs"
        
        # Use absolute paths for Windows Server 2012
        base_path = Path(DOWNLOAD_DIR).resolve()
        target_path = base_path / company_folder
        target_path.mkdir(parents=True, exist_ok=True)

        final_file_path = target_path / new_name

        # Move and Cleanup
        shutil.move(temp_path, str(final_file_path))
        logger.info(f"SUCCESS: Saved to {final_file_path}")

        supabase.storage.from_(BUCKET_NAME).remove([file_name])
        logger.info(f"Deleted {file_name} from bucket")

    except Exception as e:
        logger.error(f"CRITICAL ERROR processing {file_name}: {str(e)}")
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    record = data.get('record', {})
    file_name = record.get('name') or data.get('name')
    bucket_id = record.get('bucket_id') or data.get('bucket_id')

    if bucket_id != BUCKET_NAME or not file_name or file_name == '.emptyFolderPlaceholder':
        return "Ignored", 200

    download_and_delete_file(file_name)
    return "OK", 200

def sync_bucket():
    logger.info("Starting initial sync...")
    try:
        files = supabase.storage.from_(BUCKET_NAME).list()
        for f in files:
            name = f['name']
            if name != '.emptyFolderPlaceholder':
                download_and_delete_file(name)
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")

if __name__ == '__main__':
    # Initial Sync
    sync_bucket()
    # Start Server
    serve(app, host='0.0.0.0', port=int(os.getenv("PORT", 3001)))