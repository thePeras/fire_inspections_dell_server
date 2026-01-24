# DELL SERVER Upload PDFs Script

This script connects to the Supabase storage bucket and downloads the PDFs to the local machine. After a file is downloaded, it is deleted from the bucket.
It also creates a webhook to listen for new files and download them as they are uploaded.

The file deletion from the supabase bucket updates the inspection status from "APPROVED" to "COMPLETED" and informs the user that the file was successfully downloaded to the local server.

## Setup env file

Copy the example file to .env
```bash
cp .env.example .env
```

Fill the values in the .env file.

## Setup a tunnel

### Get the Token from Cloudflare
- Log into your Cloudflare Zero Trust Dashboard.
- Go to Networks > Tunnels.
- Click Create a tunnel.
- Select Cloudflared (the default).
- Name it (e.g., `inspections-dell-server-tunnel`).
- You will see a "Install and run a connector" page. Look for the command under your OS (Linux/Windows/Mac).
- Copy only the long string of random characters after the --token flag. That is your TUNNEL_TOKEN.

Update the env file with the token.
```bash
TUNNEL_TOKEN=YOUR_TOKEN_HERE
```

Install the tunnel service, so it runs automatically on boot.
```bash
sudo cloudflared service install YOUR_TOKEN_HERE
```

### Configure the "Public Hostname"
- In the same Cloudflare setup wizard:
- Public Hostname: `inspections.yourdomain.com`.
- Service Type: HTTP
- URL: `localhost:3001`.


## Setup the supabase webhook

- Go to your Supabase Dashboard.
- Navigate to Database (the table icon) > Webhooks.
- If it asks you to "Enable Webhooks," click the button to enable the pg_net extension.
- Click Create a new webhook.

```
Name: <>
Table: Select the objects table, storage schema
Events: Check Insert and Update.
Webhook Method: POST
URL: The Cloudflare Tunnel URL: https://inspections.yourdomain.com/webhook. Don't forget to include the /webhook at the end.
```

## Build server code

```bash
npm run build
```

## Setup Script auto running

```bash
npm install -g pm2
pm2 start dist/index.js --name fire-reports
pm2 startup
pm2 save
```