import express from 'express';
import { createClient } from '@supabase/supabase-js';
import type { FileObject } from '@supabase/storage-js'
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import logger from './logger';

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

if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

async function downloadAndDeleteFile(file: FileObject) {
    try {
        logger.info(`Processing file: ${file.name}`);

        // Download the file
        const { data, error: downloadError } = await supabase.storage
            .from(BUCKET_NAME)
            .download(file.name);

        if (downloadError) throw downloadError;

        const buffer = Buffer.from(await data.arrayBuffer());

        // Get the metadata
        const { data: expandedData, error: metadataError } = await supabase.storage
            .from(BUCKET_NAME)
            .info(file.name);

        if (metadataError) throw metadataError;

        const { metadata } = expandedData;
        const { companySlug, clientId, establishmentId, typeCode, dateStr, inspectionName } = metadata as any;

        const newFileName = `${clientId}.${typeCode}.1.${establishmentId} relatorio de verificacao ${inspectionName} ${dateStr}.pdf`;

        const companyFolder = companySlug === "vianafogo" ? "999" : "333";

        if (!fs.existsSync(path.join(DOWNLOAD_DIR, companyFolder))) {
            fs.mkdirSync(path.join(DOWNLOAD_DIR, companyFolder));
        }

        const filePath = path.join(DOWNLOAD_DIR, companyFolder, newFileName);
        fs.writeFileSync(filePath, buffer);
        logger.info(`Saved ${file.name} to ${filePath}`);

        const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([file.name]);

        if (deleteError) throw deleteError;
        logger.info(`Deleted ${file.name} from bucket`);

    } catch (err: any) {
        logger.error(`Error processing ${file.name}`, { error: err.message });
    }
}

async function syncBucket() {
    logger.info('Starting init sync...');
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list();

        if (error) throw error;

        if (!data || data.length === 0) {
            logger.info('No files found in bucket to sync.');
            return;
        }

        logger.info(`Found ${data.length} files to sync. Processing...`);
        for (const file of data) {
            if (file.name === '.emptyFolderPlaceholder') continue;
            await downloadAndDeleteFile(file);
        }
    } catch (err: any) {
        logger.error('Error during sync', { error: err.message });
    }
    logger.info('Sync completed.');
}

app.post('/webhook', async (req: any, res: any) => {
    logger.info('New webhook notification: ', req.body?.record?.name);
    const { record, name, bucket_id } = req.body;

    const fileName = record?.name || name;
    const bucketId = record?.bucket_id || bucket_id;

    if (bucketId !== BUCKET_NAME || !fileName || fileName === '.emptyFolderPlaceholder') {
        return res.status(200).send('Ignored');
    }

    logger.info(`Fetching details...`);

    try {
        const { data: files, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list('', { search: fileName, limit: 1 });

        if (error) throw error;

        const fileInfo = files?.find(f => f.name === fileName);

        if (fileInfo) {
            downloadAndDeleteFile(fileInfo)
        } else {
            logger.warn(`File ${fileName} not found in storage listing.`);
        }

        res.status(200).send('OK');
    } catch (err: any) {
        logger.error('Webhook fetch failed', { error: err.message });
        res.status(500).send('Internal Error');
    }
});

app.listen(PORT, async () => {
    logger.info(`Reports pdfs syncing server running on port ${PORT}`);
    await syncBucket();
});