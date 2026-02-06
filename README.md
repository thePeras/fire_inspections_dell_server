# DELL SERVER Upload PDFs Script

This script connects to the Supabase storage bucket and downloads the PDFs to the local machine. After a file is downloaded, it is deleted from the bucket.
It also creates a webhook to listen for new files and download them as they are uploaded.

The file deletion from the supabase bucket updates the inspection status from "APPROVED" to "COMPLETED" and informs the user that the file was successfully downloaded to the local server.

# Instructions

## Setup env file

Copy the example file to .env
```bash
cp .env.example .env
```

Fill the values in the .env file.

## Install Cloudflared

Follow the instructions for your operating system to install Cloudflared: [https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)

## Setup a tunnel

Install the tunnel service, so it runs automatically on boot.
```bash
sudo cloudflared service install YOUR_TOKEN_HERE
```

## Install the corresponding Nodejs

Visit the Node.js download page and install the latest LTS version for the operating system: [https://nodejs.org/en/download](https://nodejs.org/en/download)

## Install dependencies

```bash
npm install
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