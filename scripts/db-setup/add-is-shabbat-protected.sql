-- Check and add is_shabbat_protected column to organizations table
-- This ensures the schema.prisma matches the actual database structure

DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'is_shabbat_protected'
    ) THEN
        -- Add column with default value
        ALTER TABLE organizations 
        ADD COLUMN is_shabbat_protected BOOLEAN DEFAULT true NOT NULL;
        
        RAISE NOTICE 'Column is_shabbat_protected added to organizations table';
    ELSE
        RAISE NOTICE 'Column is_shabbat_protected already exists in organizations table';
    END IF;
END $$;

-- Verify the column was added/exists
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name = 'is_shabbat_protected';
