-- Run this in Supabase -> SQL Editor (for your EXISTING project).
-- Fixes the duplicate-name issue ("Clive" appearing twice).

-- 1. Clean up existing duplicates, keeping each name's best score.
delete from scores a using scores b
where a.player_name = b.player_name
  and (a.score < b.score or (a.score = b.score and a.id > b.id));

-- 2. Stop future duplicates at the database level too.
alter table scores add constraint scores_player_name_unique unique (player_name);

-- 3. The app now updates an existing row instead of inserting a new
--    one when the same name plays again, so it needs an UPDATE policy.
create policy "Public can update scores"
  on scores for update
  using (true)
  with check (
    char_length(player_name) between 1 and 20
    and score >= 0
    and score <= 999999
  );
