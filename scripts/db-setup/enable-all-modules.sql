-- Enable all 6 modules in launch_scope_modules
-- This ensures all modules are available system-wide

DO $$
DECLARE
    current_value JSONB;
    new_value JSONB;
BEGIN
    -- Get current feature_flags value
    SELECT value::jsonb INTO current_value
    FROM social_system_settings
    WHERE key = 'feature_flags';

    -- If no record exists, create default
    IF current_value IS NULL THEN
        new_value := jsonb_build_object(
            'maintenanceMode', false,
            'aiEnabled', true,
            'bannerMessage', null,
            'fullOfficeRequiresFinance', false,
            'enable_payment_manual', true,
            'enable_payment_credit_card', false,
            'launch_scope_modules', jsonb_build_object(
                'nexus', true,
                'system', true,
                'social', true,
                'finance', true,
                'client', true,
                'operations', true
            )
        );
    ELSE
        -- Update existing value with all modules enabled
        new_value := jsonb_set(
            current_value,
            '{launch_scope_modules}',
            jsonb_build_object(
                'nexus', true,
                'system', true,
                'social', true,
                'finance', true,
                'client', true,
                'operations', true
            ),
            true
        );
    END IF;

    -- Upsert the feature_flags
    INSERT INTO social_system_settings (key, value, created_at, updated_at)
    VALUES ('feature_flags', new_value, NOW(), NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = new_value,
        updated_at = NOW();

    RAISE NOTICE 'Successfully enabled all 6 modules in launch_scope_modules';
END $$;

-- Verify the update
SELECT 
    key,
    value->'launch_scope_modules' as launch_scope_modules,
    updated_at
FROM social_system_settings
WHERE key = 'feature_flags';
