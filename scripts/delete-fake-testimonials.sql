-- Delete fake testimonials that were added in migration
-- These are the demo testimonials: דוד כהן, רחל לוי, משה אברהם

DELETE FROM landing_testimonials 
WHERE name IN ('דוד כהן', 'רחל לוי', 'משה אברהם')
  AND company IN ('כהן שירותים', 'לוי אחזקה', 'אברהם מיזוג');

-- Show remaining testimonials (should be empty or only real ones)
SELECT * FROM landing_testimonials ORDER BY sort_order;
