-- init-db.sql — Least-privilege database user for Componode
-- Run automatically by Docker Compose on first Postgres boot.
-- For external Postgres, run this script manually as a superuser.

CREATE ROLE componode WITH LOGIN PASSWORD 'componode_pw';
CREATE DATABASE componode OWNER componode;

-- Grant necessary privileges for migrations + runtime
GRANT ALL PRIVILEGES ON DATABASE componode TO componode;
