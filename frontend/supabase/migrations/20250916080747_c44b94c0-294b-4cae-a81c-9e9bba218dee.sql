-- Extend grade level enum to include grades 11 and 12
ALTER TYPE grade_level ADD VALUE IF NOT EXISTS '11';
ALTER TYPE grade_level ADD VALUE IF NOT EXISTS '12';