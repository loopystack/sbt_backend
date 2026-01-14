-- Grant permissions to betting_master user
-- Run this as postgres superuser: psql -U postgres -d sportsbetting -f grant_database_permissions.sql

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO betting_master;

-- Grant create privileges on the public schema
GRANT CREATE ON SCHEMA public TO betting_master;

-- Grant all privileges on all existing tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO betting_master;

-- Grant all privileges on all existing sequences in public schema
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO betting_master;

-- Grant privileges on future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO betting_master;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO betting_master;

-- If the user needs to create functions (optional)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO betting_master;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO betting_master;
