-- The presidency fills a program gradually: date, type and speakers are often
-- known weeks ahead, while hymns, prayers, presiding and conducting are decided
-- later. NULL means "not decided yet"; the app never stores '' or placeholder
-- text in these columns.

ALTER TABLE meetings ALTER COLUMN presiding DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN conducting DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN opening_hymn DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN opening_prayer DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN sacrament_hymn DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN closing_hymn DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN closing_prayer DROP NOT NULL;
