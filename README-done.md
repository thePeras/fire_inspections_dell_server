This instructions were already done and should be ignored. They are here for reference only.
See [README.md](README.md) for the full instructions.


## Cloudflare tunnel

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
