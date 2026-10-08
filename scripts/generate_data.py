#!/usr/bin/env python3
"""Regenerate the fictional dataset and refresh the offline dashboard records.

Uses only the Python standard library. Random seed is fixed so output is stable.
Run from the repository root: python scripts/generate_data.py
"""
from pathlib import Path
import random, csv, json
from datetime import date, timedelta
ROOT=Path(__file__).resolve().parents[1]

rr=random.Random(8248)
support=[]
issue_groups=['Billing','Account Access','Technical Issue','Shipping','Product Information','Returns']
priority_groups=['Low','Medium','High','Urgent'];agents=['Atlas','Nova','Orion','Echo'];channels=['Email','Live Chat','Phone','Web Form']
for n in range(1,1501):
    opened=date(2024,1,1)+timedelta(days=rr.randrange(1002))
    issue=rr.choice(issue_groups);prio=rr.choices(priority_groups,[28,43,24,5])[0]
    solved=rr.random()<(.92 if prio!='Urgent' else .80)
    hours=round(max(.5,rr.lognormvariate(2.7,.68)*(1.55 if prio=='Low' else .75 if prio=='Urgent' else 1)),1) if solved else ''
    sla_target={'Low':72,'Medium':48,'High':24,'Urgent':8}[prio]
    sla='Met' if solved and hours<=sla_target else 'Missed' if solved else 'Not evaluated'
    sat= max(1,min(5,round(rr.gauss(4.1 if solved and sla=='Met' else 3.1,.88)))) if solved else ''
    support.append({'ticket_id':f'TKT-{n:05}','opened_date':opened.isoformat(),'year':opened.year,'team':rr.choice(agents),'channel':rr.choices(channels,[38,35,19,8])[0],'issue_type':issue,'priority':prio,'status':'Resolved' if solved else 'Open','resolution_hours':hours,'sla_target_hours':sla_target,'sla_result':sla,'csat_score':sat})
support.sort(key=lambda r:r['opened_date'])


rows=support
output=ROOT/'data'/'sample_data.csv'
with output.open('w',encoding='utf-8',newline='') as file:
    writer=csv.DictWriter(file,fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
js=ROOT/'assets'/'data.js'
source=js.read_text(encoding='utf-8')
marker='window.DASHBOARD_ROWS = '
if marker not in source:
    raise RuntimeError('Bundled records marker missing from assets/data.js')
js.write_text(source.split(marker,1)[0] + marker + json.dumps(rows,separators=(',',':'),ensure_ascii=False) + ';\n',encoding='utf-8')
print(f'Regenerated {len(rows):,} synthetic records')
