CREATE TABLE IF NOT EXISTS tickets (
ticket_id TEXT PRIMARY KEY,opened_date TEXT NOT NULL,year INTEGER NOT NULL,
team TEXT NOT NULL,channel TEXT NOT NULL,issue_type TEXT NOT NULL,
priority TEXT NOT NULL,status TEXT NOT NULL,resolution_hours REAL,
sla_target_hours INTEGER NOT NULL,sla_result TEXT NOT NULL,csat_score REAL);
CREATE INDEX IF NOT EXISTS idx_tickets_date_team ON tickets(opened_date,team);
