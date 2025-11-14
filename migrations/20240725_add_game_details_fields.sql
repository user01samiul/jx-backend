ALTER TABLE games
  ADD COLUMN features JSONB DEFAULT '[]',
  ADD COLUMN rating FLOAT,
  ADD COLUMN popularity FLOAT,
  ADD COLUMN last_win NUMERIC,
  ADD COLUMN max_win NUMERIC,
  ADD COLUMN description TEXT,
  ADD COLUMN last_updated TIMESTAMP DEFAULT now(); 