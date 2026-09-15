-- pg_trgm's `<%` (word_similarity) operator defaults to a 0.6 threshold, which
-- is too strict for the way people actually type food names: "yogrt" scores
-- 0.50 against "Greek yogurt, 0% fat" and is therefore dropped entirely.
--
-- 0.4 recovers the realistic single-character typos ("chiken", "brocoli",
-- "yogrt") without pulling in unrelated rows. Set on the database so every
-- connection and every replica inherits it, rather than being re-SET per query.
ALTER DATABASE wellness SET pg_trgm.word_similarity_threshold = 0.4;
