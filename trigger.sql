-- 1. Create the bucket 'reports-pdfs' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports-pdfs', 'reports-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the function to handle file deletion
CREATE OR REPLACE FUNCTION public.handle_bucket_delete()
RETURNS trigger AS $$
DECLARE
  inspection_id text;
  raw_metadata jsonb;
BEGIN
  -- Extract metadata
  raw_metadata := OLD.metadata;
  
  -- Check if metadata contains inspection_id
  IF raw_metadata ? 'inspection_id' THEN
    inspection_id := raw_metadata ->> 'inspection_id';
    
    -- Update inspection status to COMPLETED
    UPDATE "Inspection"
    SET status = 'COMPLETED', "closedAt" = NOW()
    WHERE id = inspection_id;
    
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_file_delete ON storage.objects;

CREATE TRIGGER on_file_delete
AFTER DELETE ON storage.objects
FOR EACH ROW
WHEN (old.bucket_id = 'reports-pdfs')
EXECUTE FUNCTION public.handle_bucket_delete();
