-- Verify that closure prediction columns exist in system_leads table

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'system_leads'
  AND column_name IN ('closure_probability', 'closure_rationale', 'recommended_action')
ORDER BY column_name;

-- Also check if any leads have these fields populated
SELECT 
    COUNT(*) as total_leads,
    COUNT(closure_probability) as leads_with_closure_prob,
    COUNT(closure_rationale) as leads_with_rationale,
    COUNT(recommended_action) as leads_with_action
FROM system_leads;
