-- 1. Monthly incoming volume and SLA results among resolved cases.
SELECT substr(opened_date,1,7) AS month, COUNT(*) AS tickets,
       SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) AS resolved,
       ROUND(100.0*SUM(CASE WHEN sla_result='Met' THEN 1 ELSE 0 END)/
             NULLIF(SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END),0),2) AS sla_pct
FROM tickets GROUP BY substr(opened_date,1,7) ORDER BY month;

-- 2. Open backlog by priority.
SELECT priority,COUNT(*) AS backlog FROM tickets
WHERE status='Open' GROUP BY priority ORDER BY backlog DESC;

-- 3. Team service level metrics.
SELECT team,COUNT(*) AS tickets,
       ROUND(AVG(CASE WHEN status='Resolved' THEN resolution_hours END),2) AS avg_resolution_hours,
       ROUND(100.0*SUM(CASE WHEN sla_result='Met' THEN 1 ELSE 0 END)/
             NULLIF(SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END),0),2) AS sla_pct
FROM tickets GROUP BY team ORDER BY sla_pct DESC;

-- 4. Priority mix and observed service level.
SELECT priority,COUNT(*) AS tickets,
       SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END) AS resolved,
       ROUND(AVG(CASE WHEN status='Resolved' THEN resolution_hours END),2) AS avg_resolution_hours
FROM tickets GROUP BY priority ORDER BY tickets DESC;
