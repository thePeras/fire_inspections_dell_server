# DELL SERVER Upload PDFs Script

This script connects to the Supabase storage bucket and downloads the PDFs to the local machine. After a file is downloaded, it is deleted from the bucket.
It also creates a webhook to listen for new files and download them as they are uploaded.

The file deletion from the supabase bucket updates the inspection status from "APPROVED" to "COMPLETED" and informs the user that the file was successfully downloaded to the local server.

# Instructions

## 1. Cloudflare tunnel

### Get the Token from Cloudflare
- Log into your Cloudflare Zero Trust Dashboard.
- Go to Networks > Tunnels.
- Click Create a tunnel.
- Select Cloudflared (the default).
- Name it (e.g., `inspections-dell-server-tunnel`).
- You will see a "Install and run a connector" page. Look for the command under your OS (Linux/Windows/Mac).
- Copy only the long string of random characters after the --token flag. That is your TUNNEL_TOKEN.

### Configure the "Public Hostname"
- In the same Cloudflare setup wizard:
- Public Hostname: `inspections.yourdomain.com`.
- Service Type: HTTP
- URL: `localhost:3001`.

## 2. Setup the supabase webhook

- Go to your Supabase Dashboard.
- Navigate to Database (the table icon) > Webhooks.
- If it asks you to "Enable Webhooks," click the button to enable the pg_net extension.
- Click Create a new webhook.

```text
Name: <>
Table: Select the objects table, storage schema
Events: Check Insert and Update.
Webhook Method: POST
URL: The Cloudflare Tunnel URL: https://inspections.yourdomain.com/webhook. Don't forget to include the /webhook at the end.
```

## 3. Setup env file

Copy the example file to .env
```bash
cp .env.example .env
```

Fill the .env with the file sent by the author and edit only the DOWNLOAD_DIR variable, to point to the parent folder of "999" and "333".

Update the env file with the token:
```bash
TUNNEL_TOKEN=YOUR_TOKEN_HERE
```

## 4. Install Cloudflared

Follow the instructions for your operating system to install Cloudflared: [https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)

## 5. Setup a tunnel

Install the tunnel service, so it runs automatically on boot.
Change the TUNNEL_TOKEN with the token from the .env file.

```bash
sudo cloudflared service install TUNNEL_TOKEN
```

## 6. Install the corresponding Nodejs

Visit the Node.js download page and install the latest LTS version for the operating system: [https://nodejs.org/en/download](https://nodejs.org/en/download)

## 7. Create the environment and activate it

```bash
conda create --name fire-reports python=3.8.10
conda activate fire-reports
```

## 8. Install the packages using pip within conda

```bash
pip install -r requirements.txt
```

## 9. Setup Script auto running

```bash
npm install -g pm2
pm2 start main.py --interpreter python --name fire-reports
pm2 startup
pm2 save
```