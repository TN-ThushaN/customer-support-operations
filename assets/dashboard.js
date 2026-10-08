/* Zero-dependency dashboard engine. Charts update from the bundled sample rows. */
(() => {
  'use strict';
  const config = window.DASHBOARD_CONFIG;
  const allRows = window.DASHBOARD_ROWS || [];
  const palette = ['#60d9b9','#538cf1','#eab765','#b088ef','#ed829c','#8dd6e3','#b0c873'];
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const human = (number,digits=0) => Number(number || 0).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const dataValue = (row, field) => Number(row[field]) || 0;
  const meeting = (row, rule) => !rule || (row[rule.field] === rule.value);
  function calcMetric(metric,rows) {
    const scope = metric.only ? rows.filter(row => meeting(row,metric.only)) : rows;
    const count = scope.length;
    switch(metric.type) {
      case 'count': return count;
      case 'sum': return scope.reduce((a,r) => a + dataValue(r,metric.field),0);
      case 'average': {const valid=scope.filter(r=>r[metric.field]!=='' && r[metric.field]!=null);return valid.length ? valid.reduce((a,r)=>a+dataValue(r,metric.field),0)/valid.length:0;}
      case 'share': return count ? scope.filter(r=>meeting(r,metric.match)).length/count*100:0;
      case 'ratio': {
        const denominator=scope.reduce((a,r)=>a+dataValue(r,metric.denominator),0);
        return denominator ? scope.reduce((a,r)=>a+dataValue(r,metric.numerator),0)/denominator*100:0;
      }
      default: return 0;
    }
  }
  function fmt(value,metric) {
    if(metric.format === 'currency')return '$' + human(value,0);
    if(metric.format === 'compactCurrency')return '$'+Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value);
    if(metric.format === 'percent')return human(value,1)+'%';
    if(metric.format === 'hours')return human(value,1)+' hrs';
    if(metric.format === 'score')return human(value,2)+'/5';
    if(metric.format === 'one')return human(value,1);
    return human(value,0);
  }
  function uniqueSorted(field){return [...new Set(allRows.map(r=>String(r[field])))].filter(Boolean).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));}
  function makeFilters(){
    const root=$('filters'); root.innerHTML='';
    config.filters.forEach(({field,label})=>{
      const el=document.createElement('label');el.className='filter';
      const caption=document.createElement('span');caption.textContent=label;
      const select=document.createElement('select');select.id='filter-'+field; select.setAttribute('aria-label','Filter by '+label);
      const option=document.createElement('option');option.value='';option.textContent='All '+label.toLowerCase();select.appendChild(option);
      uniqueSorted(field).forEach(value=>{const opt=document.createElement('option');opt.value=value;opt.textContent=value;select.appendChild(opt)});
      select.addEventListener('change',update);
      el.append(caption,select);root.appendChild(el);
    });
    const btn=document.createElement('button');btn.className='reset';btn.textContent='↺  Reset filters';btn.addEventListener('click',()=>{config.filters.forEach(f=>$('filter-'+f.field).value='');update()});root.appendChild(btn);
  }
  function filteredRows(){return allRows.filter(row=>config.filters.every(({field})=>{const choice=$('filter-'+field).value;return !choice||String(row[field])===choice}));}
  function renderKPIs(rows){
    $('kpis').innerHTML=config.kpis.map((m,i)=>`<article class="panel kpi"><div class="kpi-head"><span>${esc(m.label)}</span><span class="kpi-icon">${['▣','◉','⌁','◇'][i%4]}</span></div><div class="kpi-number">${esc(fmt(calcMetric(m,rows),m))}</div><div class="kpi-detail">${esc(m.description)}</div></article>`).join('');
  }
  function monthCode(raw){return String(raw||'').slice(0,7)}
  function renderTrend(rows){
    const {field,measure, title,subtitle} = config.trend;
    $('trend-title').textContent=title;$('trend-subtitle').textContent=subtitle;
    let dict={};
    for(const r of rows){if(measure.only && !meeting(r,measure.only)) continue;const month=monthCode(r[field]);if(!/^\d{4}-\d{2}$/.test(month))continue;(dict[month]??=[]).push(r)}
    // Include empty months to distinguish a zero value from a missing month.
    const dates=Object.keys(dict).sort();
    const toYMonth=(m)=>{const [y,month]=m.split('-').map(Number);return new Date(y,month-1,1)};
    let months=[];if(dates.length){let max=toYMonth(dates[dates.length-1]);let min=toYMonth(dates[0]);for(let i=11;i>=0;i--){let dt=new Date(max.getFullYear(),max.getMonth()-i,1);if(dt>=min){months.push(dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0'))}}}
    const values=months.map(m=>calcMetric(measure,dict[m]||[]));
    if(!months.length){$('trend').innerHTML='<p class="empty">No matching records</p>';return;}
    const svgW=760,svgH=260,padL=48,padR=18,padTop=18,padBottom=39;
    const innerW=svgW-padL-padR,innerH=svgH-padTop-padBottom;
    const top=Math.max(1,...values)*1.16;
    const px=i=>padL+(months.length===1?innerW/2:i*innerW/(months.length-1));
    const py=v=>padTop+innerH*(1-v/top);
    const points=values.map((v,i)=>[px(i),py(v)]);
    const poly=points.map(p=>p.join(',')).join(' ');
    const area=`${padL},${padTop+innerH} ${poly} ${px(values.length-1)},${padTop+innerH}`;
    const grids=[0,.25,.5,.75,1].map(q=>{let y=py(top*q);return `<line x1="${padL}" y1="${y}" x2="${svgW-padR}" y2="${y}" stroke="#34415c" stroke-width="1" stroke-dasharray="3 7"/><text x="${padL-9}" y="${y+4}" text-anchor="end" class="chart-label">${esc(config.trend.measure.format==='compactCurrency'?'$'+Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(top*q):human(top*q,0))}</text>`}).join('');
    const labels=months.map((month,i)=>{if(months.length>8 && i%2!==0 && i!==months.length-1)return '';const d=toYMonth(month);return `<text x="${px(i)}" y="${svgH-10}" text-anchor="middle" class="chart-label">${esc(d.toLocaleString('en-US',{month:'short'}))}</text>`}).join('');
    const dots=points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="var(--accent)" stroke="#151e30" stroke-width="2"><title>${esc(months[i])}: ${esc(fmt(values[i],measure))}</title></circle>`).join('');
    $('trend').innerHTML=`<svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none" role="img" aria-label="${esc(title)}"><defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".26"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${grids}<polygon points="${area}" fill="url(#trend-fill)"/><polyline points="${poly}" stroke="var(--accent)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>${dots}${labels}</svg>`;
  }
  function aggregate(rows,field,metric){
    const map=new Map();for(const r of rows){const key=String(r[field]??'Unknown');if(!map.has(key))map.set(key,[]);map.get(key).push(r)}
    return [...map.entries()].map(([key,parts])=>({key,parts,value:calcMetric(metric,parts)})).sort((a,b)=>b.value-a.value);
  }
  function renderBars(rows){
    const def=config.bars;$('bars-title').textContent=def.title;$('bars-subtitle').textContent=def.subtitle;
    const items=aggregate(rows,def.field,def.measure).slice(0,6);
    if(!items.length){$('bars').innerHTML='<p class="empty">No matching records</p>';return;}
    const max=Math.max(...items.map(x=>x.value),.0001);
    $('bars').innerHTML=items.map(item=>`<div class="bar-item"><div class="bar-top"><strong>${esc(item.key)}</strong><span>${esc(fmt(item.value,def.measure))}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,100*item.value/max).toFixed(2)}%"></div></div></div>`).join('');
  }
  function renderDonut(rows){
    const def=config.donut;$('donut-title').textContent=def.title;$('donut-subtitle').textContent=def.subtitle;
    const parts=aggregate(rows,def.field,{type:'count'}).slice(0,7);
    const total=parts.reduce((s,x)=>s+x.value,0);
    if(!total){$('donut-area').innerHTML='<p class="empty">No matching records</p>';return;}
    let last=0;const stops=parts.map((p,i)=>{const from=last;last+=p.value/total*100;return `${palette[i]} ${from}% ${last}%`}).join(',');
    const legend=parts.map((p,i)=>`<div class="legend-line"><span class="legend-key"><span class="dot" style="background:${palette[i]}"></span>${esc(p.key)}</span><span class="legend-pct">${human(p.value/total*100,0)}%</span></div>`).join('');
    $('donut-area').innerHTML=`<div class="donut-flex"><div class="donut" role="img" aria-label="Distribution of ${esc(def.field)}" style="background:conic-gradient(${stops})"><div class="donut-center"><strong>${human(total)}</strong><span>Records</span></div></div><div class="legend">${legend}</div></div>`;
  }
  function renderTable(rows){
    const def=config.table;$('table-title').textContent=def.title;$('table-subtitle').textContent=def.subtitle;
    const items=aggregate(rows,def.field,{type:'count'}).map(item=>({key:item.key,parts:item.parts,sort:calcMetric(def.sortMetric,item.parts)})).sort((a,b)=>b.sort-a.sort).slice(0,8);
    $('table-head').innerHTML=`<tr><th scope="col">${esc(def.fieldLabel)}</th>${def.columns.map(col=>`<th scope="col">${esc(col.label)}</th>`).join('')}</tr>`;
    $('table-body').innerHTML=items.length?items.map(item=>`<tr><td>${esc(item.key)}</td>${def.columns.map(col=>`<td>${esc(fmt(calcMetric(col,item.parts),col))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${def.columns.length+1}" class="empty">No matching records</td></tr>`;
  }
  function update(){const rows=filteredRows();$('record-count').textContent=human(rows.length)+' records in view';renderKPIs(rows);renderTrend(rows);renderBars(rows);renderDonut(rows);renderTable(rows);}
  document.title=config.name+' | Analytics Dashboard';
  document.documentElement.style.setProperty('--accent',config.accent);
  document.documentElement.style.setProperty('--accent-fade',config.accentFade);
  document.documentElement.style.setProperty('--accent-darker',config.accentDarker);
  document.documentElement.style.setProperty('--halo',config.halo);
  $('brand').textContent=config.brand;$('hero').textContent=config.name;$('subtitle').textContent=config.description;$('eyebrow').textContent=config.eyebrow;$('snapshot').textContent=config.snapshot;
  $('sidebar-description').textContent=config.sidebar;
  makeFilters();update();
})();