import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
const BUCKET_NAME = 'reports-pdfs';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

async function downloadAndDeleteFile(fileName: string) {
    try {
        console.log(`Processing file: ${fileName}`);

        // Download file
        const { data, error: downloadError } = await supabase.storage
            .from(BUCKET_NAME)
            .download(fileName);

        if (downloadError) throw downloadError;

        // Save locally
        const buffer = Buffer.from(await data.arrayBuffer());
        const filePath = path.join(DOWNLOAD_DIR, fileName);
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved ${fileName} to ${filePath}`);

        // Delete from bucket
        const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([fileName]);

        if (deleteError) throw deleteError;
        console.log(`Deleted ${fileName} from bucket`);

    } catch (err) {
        console.error(`Error processing ${fileName}:`, err);
    }
}

async function syncBucket() {
    console.log('Starting init sync...');
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list();

        if (error) throw error;

        if (!data || data.length === 0) {
            console.log('No files found in bucket to sync.');
            return;
        }

        console.log(`Found ${data.length} files to sync. Processing...`);
        for (const file of data) {
            if (file.name === '.emptyFolderPlaceholder') continue;
            await downloadAndDeleteFile(file.name);
        }
    } catch (err) {
        console.error('Error during sync:', err);
    }
    console.log('Sync completed.');
}

// Webhook endpoint
app.post('/webhook', async (req: any, res: any) => {
    console.log('Received webhook:', req.body);

    // Expecting Supabase Schema for Storage Insert
    // format: { type: 'INSERT', table: 'objects', record: { name: '...', bucket_id: '...' }, ... }

    const { type, table, record } = req.body;

    if (type === 'INSERT' && table === 'objects') {
        if (record.bucket_id === BUCKET_NAME) {
            // Trigger sync for this specific file
            // We don't await this to respond quickly to the webhook
            downloadAndDeleteFile(record.name).catch(console.error);
        }
    }

    res.status(200).send('OK');
});

app.listen(PORT, async () => {
    console.log(`Reports pdfs syncing server running on port ${PORT}`);
    await syncBucket();
});
