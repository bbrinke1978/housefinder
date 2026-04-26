-- Statement 1: Retag by zip (authoritative path — zip populated from UGRC or scraper)
UPDATE properties
SET city = 'Rose Park', updated_at = now()
WHERE zip = '84116'
  AND city != 'Rose Park';

-- Statement 2: Belt-and-suspenders — county+city match for rows where zip is NULL
UPDATE properties
SET city = 'Rose Park', updated_at = now()
WHERE county = 'salt lake'
  AND (city ILIKE '%salt lake%' OR city = '')
  AND city != 'Rose Park';

-- Statement 3: Idempotent upsert of target_cities in scraper_config
-- Uses jsonb @> to check membership before appending — never overwrites user-customized cities
INSERT INTO scraper_config (key, value, updated_at)
VALUES (
  'target_cities',
  '["Price","Huntington","Castle Dale","Richfield","Nephi","Ephraim","Manti","Fillmore","Delta","Rose Park"]',
  now()
)
ON CONFLICT (key) DO UPDATE
  SET value = CASE
    WHEN scraper_config.value::jsonb @> '"Rose Park"'::jsonb
    THEN scraper_config.value
    ELSE (scraper_config.value::jsonb || '["Rose Park"]'::jsonb)::text
  END,
  updated_at = now();
