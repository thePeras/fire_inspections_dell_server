-- This supabase trigger change the inspection type from "APPROVED" to "COMPLETED" 
-- when a pdf is deleted from the bucket. This means it was successfully uploaded 
-- to the DELL Server

-- 1. Create the bucket 'reports-pdfs' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports-pdfs', 'reports-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the function to handle file deletion
CREATE OR REPLACE FUNCTION public.handle_bucket_delete()
RETURNS trigger AS $$
DECLARE
  inspection_id_raw text;
BEGIN
  inspection_id_raw := split_part(OLD.name, '.pdf', 1);
  
  IF inspection_id_raw IS NOT NULL AND inspection_id_raw <> '' THEN
    
    UPDATE public."Inspection"
    SET 
      status = 'COMPLETED' 
    WHERE id = inspection_id_raw;

    IF FOUND THEN
      RAISE NOTICE 'Trigger Success: Updated Inspection % to COMPLETED', inspection_id_raw;
    ELSE
      RAISE WARNING 'Trigger Warning: No row found in "Inspection" with id = %', inspection_id_raw;
    END IF;
    
  END IF;
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Trigger Error: Failed to update status for %. Error: %', OLD.name, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_file_delete ON storage.objects;

CREATE TRIGGER on_file_delete
AFTER DELETE ON storage.objects
FOR EACH ROW
WHEN (OLD.bucket_id = 'reports-pdfs')
EXECUTE FUNCTION public.handle_bucket_delete();