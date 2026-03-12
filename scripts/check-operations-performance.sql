-- ============================================
-- בדיקת אינדקסים לטבלאות אופרציה
-- ============================================

-- בדיקת אינדקסים קיימים על operations_work_orders
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'operations_work_orders';

-- בדיקת אינדקסים על operations_inventory
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'operations_inventory';

-- בדיקת כמות רשומות לכל ארגון (לבדיקת עומס)
SELECT 
    organization_id,
    COUNT(*) as work_order_count
FROM operations_work_orders
GROUP BY organization_id
ORDER BY work_order_count DESC
LIMIT 10;

-- בדיקת כמות מלאי לכל ארגון
SELECT 
    organization_id,
    COUNT(*) as inventory_count
FROM operations_inventory
GROUP BY organization_id
ORDER BY inventory_count DESC
LIMIT 10;
