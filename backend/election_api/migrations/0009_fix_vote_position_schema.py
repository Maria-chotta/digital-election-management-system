# Repair drift: migrations 0007/0008 were recorded but the position column
# and per-position unique constraint were never applied to the database.

from django.db import migrations


FORWARD_SQL = """
ALTER TABLE election_api_vote
    ADD COLUMN IF NOT EXISTS position varchar(100) NOT NULL DEFAULT 'General';

UPDATE election_api_vote AS v
SET position = c.position
FROM election_api_candidate AS c
WHERE v.candidate_id = c.id
  AND (v.position IS NULL OR v.position = 'General');

-- Auto-heal data drift: remove duplicates that would prevent adding
-- the unique constraint (voter_id, election_id, position).
-- Keep the earliest vote (min(created_at)).
WITH ranked AS (
    SELECT
        id,
        voter_id,
        election_id,
        position,
        ROW_NUMBER() OVER (
            PARTITION BY voter_id, election_id, position
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM election_api_vote
)
DELETE FROM election_api_vote v
USING ranked r
WHERE v.id = r.id
  AND r.rn > 1;

ALTER TABLE election_api_vote
    DROP CONSTRAINT IF EXISTS one_vote_per_candidate;

ALTER TABLE election_api_vote
    DROP CONSTRAINT IF EXISTS one_vote_per_voter_per_election_position;

ALTER TABLE election_api_vote
    ADD CONSTRAINT one_vote_per_voter_per_election_position
    UNIQUE (voter_id, election_id, position);
"""



class Migration(migrations.Migration):

    dependencies = [
        ('election_api', '0008_remove_vote_one_vote_per_voter_per_election_position_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql=FORWARD_SQL,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
