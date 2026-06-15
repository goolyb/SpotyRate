/* Оценка плейлиста — парсинг CSV в браузере + рендер статистики.
   Никаких данных не вшито: пользователь загружает свой файл. */

// ---------------------------------------------------------------- CSV parser
// Поддерживает кавычки, запятые и переносы строк внутри полей.
function parseCSV(text){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1); // BOM
  const rows=[]; let row=[], field='', i=0, inQ=false;
  while(i<text.length){
    const c=text[i];
    if(inQ){
      if(c==='"'){ if(text[i+1]==='"'){field+='"';i+=2;continue;} inQ=false;i++;continue; }
      field+=c;i++;continue;
    }
    if(c==='"'){inQ=true;i++;continue;}
    if(c===','){row.push(field);field='';i++;continue;}
    if(c==='\r'){i++;continue;}
    if(c==='\n'){row.push(field);rows.push(row);row=[];field='';i++;continue;}
    field+=c;i++;
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows;
}

const num=(x)=>{const n=parseFloat(x);return isNaN(n)?null:n;};

// Превращаем строки CSV в объекты треков по именам колонок (терпимо к отсутствующим).
function toTracks(rows){
  if(!rows.length) throw new Error('Файл пустой.');
  const head=rows[0].map(h=>h.trim());
  const idx=(name)=>head.indexOf(name);
  const need=['Track Name','Artist Name(s)'];
  if(need.some(n=>idx(n)<0))
    throw new Error('Это не похоже на экспорт плейлиста из Exportify (нет колонок Track Name / Artist Name(s)).');
  const col={
    name:idx('Track Name'), artist:idx('Artist Name(s)'), album:idx('Album Name'),
    date:idx('Release Date'), dur:idx('Duration (ms)'), pop:idx('Popularity'),
    explicit:idx('Explicit'), genres:idx('Genres'),
    dance:idx('Danceability'), energy:idx('Energy'), loud:idx('Loudness'),
    speech:idx('Speechiness'), acoust:idx('Acousticness'), instr:idx('Instrumentalness'),
    live:idx('Liveness'), val:idx('Valence'), tempo:idx('Tempo'),
  };
  const get=(r,i)=>i>=0?(r[i]||''):'';
  const out=[];
  for(let k=1;k<rows.length;k++){
    const r=rows[k];
    if(!r.length || (r.length===1 && !r[0])) continue;
    if(get(r,col.name)==='' && get(r,col.artist)==='') continue;
    out.push({
      name:get(r,col.name), artist:get(r,col.artist), album:get(r,col.album),
      date:get(r,col.date), dur:num(get(r,col.dur)), pop:num(get(r,col.pop)),
      explicit:get(r,col.explicit).toLowerCase()==='true', genres:get(r,col.genres),
      dance:num(get(r,col.dance)), energy:num(get(r,col.energy)), loud:num(get(r,col.loud)),
      speech:num(get(r,col.speech)), acoust:num(get(r,col.acoust)), instr:num(get(r,col.instr)),
      live:num(get(r,col.live)), val:num(get(r,col.val)), tempo:num(get(r,col.tempo)),
    });
  }
  if(!out.length) throw new Error('Не нашлось ни одного трека в файле.');
  return out;
}

// ---------------------------------------------------------------- helpers
const $=(id)=>document.getElementById(id);
const fmtDur=(ms)=>{const m=Math.round(ms/60000);const h=Math.floor(m/60);return h?h+' ч '+(m%60)+' мин':m+' мин';};
const escapeHtml=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------------------------------------------------------------- render
function render(DATA){
  const T = DATA.filter(t=>t.energy!=null);     // треки с аудио-фичами
  const hasFeat = T.length>0;
  const avg=(k)=>T.reduce((s,t)=>s+(t[k]||0),0)/T.length;
  const avgOf=(arr,k)=>arr.reduce((s,t)=>s+(t[k]||0),0)/arr.length;

  // --- ключевые цифры
  const totalDur=DATA.reduce((s,t)=>s+(t.dur||0),0);
  const artistsSet={};
  DATA.forEach(t=>(t.artist||'').split(',').forEach(a=>{a=a.trim();if(a)artistsSet[a]=(artistsSet[a]||0)+1;}));
  const uniqArtists=Object.keys(artistsSet).length;
  const popVals=DATA.filter(t=>t.pop!=null);
  const avgPop=popVals.length?avgOf(popVals,'pop'):0;
  const explicitN=DATA.filter(t=>t.explicit).length;

  const cards=[
    [DATA.length,'треков'],
    [totalDur?fmtDur(totalDur):'—','общая длительность'],
    [uniqArtists,'уникальных артистов'],
    [Math.round(avgPop),'ср. популярность /100'],
    [Math.round(explicitN/DATA.length*100)+'%','explicit'],
  ];
  $('cards').innerHTML=cards.map(c=>
    `<div class="card"><div class="k">${c[0]}</div><div class="l">${c[1]}</div></div>`).join('');

  // --- профиль звучания
  if(hasFeat){
    $('sec-features').style.display='';
    const feats=[
      ['dance','танцевальность'],['energy','энергичность'],['val','позитив (valence)'],
      ['acoust','акустичность'],['instr','инструментальность'],['speech','речитатив'],
      ['live','живость (live)'],
    ];
    $('features').innerHTML=feats.map(f=>{
      const p=Math.round(avg(f[0])*100);
      return `<div class="row"><div class="name">${f[1]}</div><div class="bar"><span class="fill" data-w="${p}%"></span></div><div class="val">${p}</div></div>`;
    }).join('') +
      `<div style="margin-top:14px">
        <span class="chip">⌀ темп ${Math.round(avg('tempo'))} BPM</span>
        <span class="chip">⌀ громкость ${avg('loud').toFixed(1)} dB</span>
        <span class="chip">⌀ длина ${Math.round(avg('dur')/1000)} сек</span>
      </div>`;
  } else {
    $('sec-features').style.display='none';
  }

  // --- топ-листы
  function topList(obj,el,n=8){
    const arr=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);
    const max=arr[0]?arr[0][1]:1;
    $(el).innerHTML=arr.map(([k,v])=>
      `<div class="lrow"><div class="lbar"><span class="fill" data-w="${Math.round(v/max*100)}%"></span><b>${escapeHtml(k)}</b></div><div class="c">${v}</div></div>`).join('');
  }
  topList(artistsSet,'artists');

  const genresSet={};
  DATA.forEach(t=>(t.genres||'').split(',').forEach(g=>{g=g.trim();if(g)genresSet[g]=(genresSet[g]||0)+1;}));
  if(Object.keys(genresSet).length) topList(genresSet,'genres');
  else $('genres').innerHTML='<div class="row"><div class="name">Жанры в экспорте не заполнены</div></div>';

  // --- годы / десятилетия
  const years={};
  DATA.forEach(t=>{const y=(t.date||'').slice(0,4);if(/^\d{4}$/.test(y))years[y]=(years[y]||0)+1;});
  const decades={};
  Object.keys(years).forEach(y=>{const d=Math.floor(+y/10)*10;decades[d]=(decades[d]||0)+years[y];});
  const dkeys=Object.keys(decades).sort();
  const dmax=Math.max(...Object.values(decades),1);
  $('years').innerHTML = dkeys.length
    ? dkeys.map(d=>`<div class="y"><div class="yb" data-h="${decades[d]/dmax*100}%"></div><div class="yl">${d}s · ${decades[d]}</div></div>`).join('')
    : '<div class="row" style="align-self:center"><div class="name">Даты выпуска не указаны</div></div>';

  // --- рекорды
  function best(k,desc=true){return [...DATA].filter(t=>t[k]!=null).sort((a,b)=>desc?b[k]-a[k]:a[k]-b[k])[0];}
  let sups=[['Самый популярный',best('pop'),'pop','/100']];
  if(hasFeat) sups=sups.concat([
    ['Самый позитивный',best('val'),'val','valence'],
    ['Самый грустный',best('val',false),'val','valence'],
    ['Самый энергичный',best('energy'),'energy','energy'],
    ['Самый танцевальный',best('dance'),'dance','dance'],
    ['Самый быстрый',best('tempo'),'tempo','BPM'],
  ]);
  $('sup').innerHTML=sups.map(([tag,t,k,unit])=>{
    if(!t)return'';
    const v=k==='tempo'?Math.round(t[k]):(k==='pop'?Math.round(t[k]):Math.round(t[k]*100));
    return `<div class="item"><div class="tag">${tag}</div><div class="t">${escapeHtml(t.name)}</div><div class="a">${escapeHtml(t.artist)} · ${v} ${unit}</div></div>`;
  }).join('');

  // --- общая оценка (детерминированная формула, без ИИ)
  const popScore=avgPop;                                       // 0-100
  const diversity=Math.min(100,uniqArtists/DATA.length*180);   // разнообразие артистов
  let score;
  if(hasFeat){
    const energyBal=100-Math.abs(avg('energy')-0.6)*120;       // оптимум ~0.6
    const moodScore=avg('val')*100;
    score=Math.round(popScore*0.30+diversity*0.30+Math.max(0,energyBal)*0.20+moodScore*0.20);
  } else {
    score=Math.round(popScore*0.55+diversity*0.45);            // без аудио-фич
  }
  const s=Math.max(0,Math.min(100,score));
  let grade,verdict;
  if(s>=85){grade='A+';verdict='Эталонный плейлист — баланс, разнообразие и попадание в настроение.';}
  else if(s>=75){grade='A';verdict='Очень сильная подборка с отличным вайбом.';}
  else if(s>=65){grade='B';verdict='Крепкий плейлист, слушается ровно и приятно.';}
  else if(s>=55){grade='C';verdict='Неплохо, но есть куда расти по разнообразию или энергии.';}
  else if(s>=45){grade='D';verdict='На любителя — звучание довольно специфичное.';}
  else{grade='E';verdict='Очень нишево. Зато точно ваше.';}
  $('grade').textContent=grade;
  $('verdict').textContent=verdict;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{$('sbar').style.width=s+'%';}));
  countUp($('stext'),s,(n)=>'Общий балл: '+n+' / 100');

  // настроение в заголовке
  if(hasFeat){
    const e=avg('energy'),v=avg('val');
    const mood=e>0.6?(v>0.5?'бодрый и позитивный':'энергичный, но мрачноватый')
                    :(v>0.5?'расслабленный и светлый':'меланхоличный и спокойный');
    $('ptitle').textContent='Плейлист · '+mood;
  } else {
    $('ptitle').textContent='Твой плейлист';
  }

  $('resfoot').textContent = hasFeat
    ? 'Оценка считается формулой в браузере · аудио-данные Spotify'
    : 'В этом экспорте нет аудио-фич — оценка по популярности и разнообразию';

  setupReveal();
}

// ---------------------------------------------------------------- анимации
function countUp(el,target,fmt){
  let n=0,st=Math.max(1,Math.round(target/40));
  const iv=setInterval(()=>{n+=st;if(n>=target){n=target;clearInterval(iv);}el.textContent=fmt(n);},22);
}
function fillIn(t){
  t.querySelectorAll('.fill[data-w]').forEach(e=>e.style.width=e.dataset.w);
  t.querySelectorAll('.yb[data-h]').forEach(e=>e.style.height=e.dataset.h);
  t.querySelectorAll('.card .k').forEach(e=>{
    if(e.dataset.done)return; const m=e.textContent.match(/^(\d+)(%?)$/); if(!m)return;
    e.dataset.done=1; countUp(e,+m[1],(n)=>n+m[2]);
  });
}
function setupReveal(){
  const els=document.querySelectorAll('#screen-result .panel, #screen-result .cards, #screen-result .sup');
  els.forEach(e=>e.classList.add('reveal'));
  const io=new IntersectionObserver((ents)=>{ents.forEach(en=>{
    if(en.isIntersecting){en.target.classList.add('in');fillIn(en.target);io.unobserve(en.target);}
  });},{threshold:.15});
  els.forEach(e=>io.observe(e));
}

// ---------------------------------------------------------------- загрузка
function handleFile(file){
  const err=$('dzErr'); err.textContent='';
  if(!file){return;}
  if(!/\.csv$/i.test(file.name) && file.type!=='text/csv'){
    err.textContent='Нужен файл .csv'; return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const tracks=toTracks(parseCSV(reader.result));
      $('screen-upload').hidden=true;
      $('screen-result').hidden=false;
      window.scrollTo(0,0);
      render(tracks);
    }catch(e){ err.textContent=e.message||'Не удалось прочитать файл.'; }
  };
  reader.onerror=()=>{ err.textContent='Ошибка чтения файла.'; };
  reader.readAsText(file,'utf-8');
}

// ---------------------------------------------------------------- события
document.addEventListener('DOMContentLoaded',()=>{
  const dz=$('dropzone'), input=$('fileInput');
  input.addEventListener('change',()=>handleFile(input.files[0]));
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,(e)=>{e.preventDefault();dz.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,(e)=>{e.preventDefault();dz.classList.remove('drag');}));
  dz.addEventListener('drop',(e)=>{ if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
  $('backBtn').addEventListener('click',()=>{
    $('screen-result').hidden=true;
    $('screen-upload').hidden=false;
    $('fileInput').value='';
    window.scrollTo(0,0);
  });
});
