-- Check for ClientClients without MisradClient records
SELECT 
    cc.id as clientclient_id,
    cc.full_name,
    cc.organization_id,
    mc.id as misradclient_id,
    mc.client_client_id
FROM client_clients cc 
LEFT JOIN misrad_clients mc ON mc.client_client_id = cc.id 
WHERE cc.organization_id = 'misrad-ai-hq' 
ORDER BY cc.created_at DESC 
LIMIT 10;
