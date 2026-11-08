-- =========================================================================
-- MANUAL SCRIPT - DO NOT RUN AUTOMATICALLY. Review before executing.
--
-- Purpose: recalculate products.avg_rating from the reviews table.
-- The database has no trigger for this; the API now keeps the value in sync
-- on review add/update/delete, but ratings created before that fix are stale.
--
-- Safety: only updates products whose stored value differs from the real
-- average, touches only products.avg_rating, runs in one transaction.
-- =========================================================================

-- 1) PREVIEW (read-only): rows that would change
SELECT p.id,
       p.name,
       p.avg_rating AS current_avg,
       COALESCE(ROUND(AVG(r.rating), 2), 0) AS correct_avg
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id
GROUP BY p.id, p.name, p.avg_rating
HAVING p.avg_rating IS DISTINCT FROM COALESCE(ROUND(AVG(r.rating), 2), 0)
ORDER BY p.id;

-- 2) UPDATE (run only after reviewing the preview)
BEGIN;

UPDATE products p
SET avg_rating = COALESCE(
      (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.product_id = p.id),
      0)
WHERE p.avg_rating IS DISTINCT FROM COALESCE(
      (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.product_id = p.id),
      0);

-- Verify, then COMMIT (or ROLLBACK if anything looks wrong):
-- SELECT id, avg_rating FROM products ORDER BY id;
COMMIT;
