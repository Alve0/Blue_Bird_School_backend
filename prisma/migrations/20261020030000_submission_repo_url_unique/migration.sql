DO $migration$
BEGIN
    IF EXISTS (
        SELECT LOWER("repoUrl")
        FROM "Submission"
        GROUP BY LOWER("repoUrl")
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Submission URL migration stopped: duplicate repository URLs differ only by letter case. Resolve duplicates, then rerun the migration.';
    END IF;
END
$migration$;

CREATE UNIQUE INDEX "Submission_repoUrl_lower_key"
    ON "Submission"(LOWER("repoUrl"));
