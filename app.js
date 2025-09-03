// ===== State =====
var tasks = [];
var activeRef = null; // { type:'task'|'sub', taskId:number, subId?:number }
var timerInterval = null;
var nextId = 1; // monotonic id
function uid(){ return nextId++; }

// ===== Utils =====
function fmt(s){ var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60; return (h+'').padStart(2,'0')+':'+(m+'').padStart(2,'0')+':'+(x+'').padStart(2,'0'); }
function hasSubtasks(t){ return t.subtasks && t.subtasks.length>0; }
function getTask(id){ for(var i=0;i<tasks.length;i++){ if(tasks[i].id===id) return tasks[i]; } return null; }
function getSubtask(taskId, subId){ var t=getTask(taskId); if(!t) return null; for(var i=0;i<t.subtasks.length;i++){ if(t.subtasks[i].id===subId) return t.subtasks[i]; } return null; }
function parentSeconds(t){ var d=t.parent.duration; if(activeRef && activeRef.type==='task' && activeRef.taskId===t.id && t.parent.startTime){ d += Math.floor((Date.now()-t.parent.startTime)/1000); } return d; }
function sumSubSeconds(t){ var acc=0; for(var i=0;i<t.subtasks.length;i++){ var st=t.subtasks[i]; var d=st.duration; if(activeRef && activeRef.type==='sub' && activeRef.taskId===t.id && activeRef.subId===st.id && st.startTime){ d += Math.floor((Date.now()-st.startTime)/1000); } acc+=d; } return acc; }
function totalSeconds(t){ return hasSubtasks(t) ? sumSubSeconds(t) : parentSeconds(t); }
function isTaskCompleted(t){ if(!hasSubtasks(t)) return t.parent.status==='completed'; if(t.subtasks.length===0) return false; for(var i=0;i<t.subtasks.length;i++){ if(t.subtasks[i].status!=='completed') return false; } return true; }
function safeStopTickerIfIdle(){ if(!activeRef){ clearInterval(timerInterval); timerInterval=null; } }

// ===== CRUD main tasks =====
function addTask(){ var input=document.getElementById('taskInput'); var name=(input.value||'').trim(); if(!name) return; tasks.push({id:uid(),name:name,collapsed:true,parent:{status:'pending',duration:0,startTime:null},subtasks:[]}); input.value=''; render(); }
function deleteTask(taskId){ if(activeRef && activeRef.taskId===taskId){ completeActive(); } tasks = tasks.filter(function(t){return t.id!==taskId}); safeStopTickerIfIdle(); render(); }

// ===== Parent timer (no subtasks) =====
function startParent(taskId){ var t=getTask(taskId); if(!t||hasSubtasks(t)) return; if(activeRef) completeActive(); t.parent.status='in-progress'; t.parent.startTime=Date.now(); activeRef={type:'task',taskId:taskId}; startTicker(); render(); }
function stopParent(taskId){ var t=getTask(taskId); if(!t||hasSubtasks(t)||t.parent.status!=='in-progress') return; t.parent.duration += Math.floor((Date.now()-t.parent.startTime)/1000); t.parent.startTime=null; t.parent.status='completed'; if(activeRef && activeRef.type==='task' && activeRef.taskId===taskId){ activeRef=null; clearInterval(timerInterval);} render(); }
function resetParent(taskId){ var t=getTask(taskId); if(!t||hasSubtasks(t)) return; if(activeRef && activeRef.type==='task' && activeRef.taskId===taskId){ activeRef=null; clearInterval(timerInterval);} t.parent.status='pending'; t.parent.duration=0; t.parent.startTime=null; render(); }

// ===== Subtasks & collapsing =====
function expandToAdd(taskId){ var t=getTask(taskId); if(!t) return; t.collapsed=false; render(); var inp=document.getElementById('subInput-'+taskId); if(inp){ try{ inp.focus(); }catch(e){} } }
function collapseCard(taskId){ var t=getTask(taskId); if(!t) return; t.collapsed=true; render(); }
function toggleCollapse(taskId){ var t=getTask(taskId); if(!t) return; t.collapsed=!t.collapsed; render(); }

function addSubtask(taskId){ var inp=document.getElementById('subInput-'+taskId); var name=(inp && inp.value ? inp.value : '').trim(); if(!name) return; var t=getTask(taskId); if(!t) return; if(!hasSubtasks(t) && t.parent.startTime){ t.parent.duration += Math.floor((Date.now()-t.parent.startTime)/1000); t.parent.startTime=null; t.parent.status='completed'; if(activeRef && activeRef.type==='task' && activeRef.taskId===taskId){ activeRef=null; clearInterval(timerInterval);} } t.subtasks.push({id:uid(),name:name,status:'pending',duration:0,startTime:null}); if(inp){ inp.value=''; setTimeout(function(){ inp.focus(); },0); } render(); setTimeout(function(){ var ref=document.getElementById('subInput-'+taskId); if(ref) ref.focus(); },0); }
function startSubtask(taskId, subId){ var st=getSubtask(taskId, subId); var t=getTask(taskId); if(!st||st.status==='completed'||!t) return; if(activeRef) completeActive(); st.status='in-progress'; st.startTime=Date.now(); activeRef={type:'sub',taskId:taskId,subId:subId}; startTicker(); render(); }
function stopSubtask(taskId, subId){ var st=getSubtask(taskId, subId); var t=getTask(taskId); if(!st||st.status!=='in-progress'||!t) return; st.duration += Math.floor((Date.now()-st.startTime)/1000); st.startTime=null; st.status='completed'; if(activeRef && activeRef.type==='sub' && activeRef.taskId===taskId && activeRef.subId===subId){ activeRef=null; clearInterval(timerInterval);} render(); }
function resetSubtask(taskId, subId){ var st=getSubtask(taskId, subId); if(!st) return; if(activeRef && activeRef.type==='sub' && activeRef.taskId===taskId && activeRef.subId===subId){ activeRef=null; clearInterval(timerInterval);} st.status='pending'; st.duration=0; st.startTime=null; render(); }
function resetAllSubtasks(taskId){ var t=getTask(taskId); if(!t||!hasSubtasks(t)) return; if(activeRef && activeRef.type==='sub' && activeRef.taskId===taskId){ activeRef=null; clearInterval(timerInterval);} t.subtasks = t.subtasks.map(function(s){ return {id:s.id, name:s.name, status:'pending', duration:0, startTime:null}; }); safeStopTickerIfIdle(); render(); }
function deleteSubtask(taskId, subId){ var st=getSubtask(taskId, subId); var t=getTask(taskId); if(!t) return; if(st && activeRef && activeRef.type==='sub' && activeRef.taskId===taskId && activeRef.subId===subId){ stopSubtask(taskId,subId); } t.subtasks = t.subtasks.filter(function(s){return s.id!==subId}); safeStopTickerIfIdle(); render(); }

function completeActive(){ if(!activeRef) return; if(activeRef.type==='task'){ stopParent(activeRef.taskId); } else if(activeRef.type==='sub'){ stopSubtask(activeRef.taskId, activeRef.subId); } }

// ===== Clear completed =====
function isTaskFullyCompleted(t){ return (!hasSubtasks(t) && t.parent.status==='completed') || (hasSubtasks(t) && t.subtasks.length>0 && t.subtasks.every(function(s){return s.status==='completed'})); }
function clearAllCompleted(){ tasks = tasks.filter(function(t){ return !isTaskFullyCompleted(t); }); tasks.forEach(function(t){ if(hasSubtasks(t)){ t.subtasks = t.subtasks.filter(function(s){return s.status!=='completed'}); } }); safeStopTickerIfIdle(); render(); }

// ===== Timer =====
function startTicker(){ clearInterval(timerInterval); timerInterval=setInterval(renderTimesOnly,1000); }
function renderTimesOnly(){ tasks.forEach(function(task){ var tt=document.getElementById('tt-'+task.id); if(tt){ tt.textContent= fmt(totalSeconds(task)); } task.subtasks.forEach(function(st){ var active = activeRef && activeRef.type==='sub' && activeRef.taskId===task.id && activeRef.subId===st.id && st.startTime; if(active){ var el=document.getElementById('st-'+task.id+'-'+st.id); if(el){ var d=st.duration+Math.floor((Date.now()-st.startTime)/1000); el.textContent=fmt(d);} } }); }); }

// ===== Render =====
function render(){
  var host=document.getElementById('taskList'); host.innerHTML='';

  tasks.forEach(function(task){
    var card=document.createElement('div'); card.className='card';
    var total=totalSeconds(task); var completed=isTaskCompleted(task);

    var header=document.createElement('div'); header.className='task-header';
    var left=document.createElement('div');
    var title=document.createElement('div'); title.className='task-title title-line'+(completed?' completed':''); title.textContent=task.name; left.appendChild(title);
    var timeWrap=document.createElement('div'); timeWrap.className='muted'; var timeSpan=document.createElement('span'); timeSpan.className='time'+(completed?' dim small':''); timeSpan.id='tt-'+task.id; timeSpan.textContent=fmt(total); timeWrap.appendChild(timeSpan); left.appendChild(timeWrap);
    header.appendChild(left);

    var controls=document.createElement('div'); controls.className='controls';
    if(!hasSubtasks(task)){
      if(task.parent.status!=='in-progress' && task.parent.status!=='completed'){
        var b1=document.createElement('button'); b1.className='btn green'; b1.textContent='▶'; b1.setAttribute('aria-label','Start task'); b1.addEventListener('click', function(){ startParent(task.id); }); controls.appendChild(b1);
      }
      if(task.parent.status==='in-progress'){
        var b2=document.createElement('button'); b2.className='btn red'; b2.textContent='■'; b2.setAttribute('aria-label','Stop task'); b2.addEventListener('click', function(){ stopParent(task.id); }); controls.appendChild(b2);
      }
      if(task.parent.status==='completed'){
        var b3=document.createElement('button'); b3.className='icon-btn gray'; b3.textContent='↺'; b3.setAttribute('aria-label','Reset task'); b3.addEventListener('click', function(){ resetParent(task.id); }); controls.appendChild(b3);
      }
      var b4=document.createElement('button'); b4.className='icon-btn gray'; b4.textContent='✕'; b4.setAttribute('aria-label','Delete task'); b4.addEventListener('click', function(){ deleteTask(task.id); }); controls.appendChild(b4);
    } else {
      var allSubsCompleted = task.subtasks.length>0 && task.subtasks.every(function(s){return s.status==='completed'});
      if(allSubsCompleted){ var rAll=document.createElement('button'); rAll.className='icon-btn gray'; rAll.textContent='↺'; rAll.setAttribute('aria-label','Reset all subtasks'); rAll.addEventListener('click', function(){ resetAllSubtasks(task.id); }); controls.appendChild(rAll); }
      var del=document.createElement('button'); del.className='icon-btn gray'; del.textContent='✕'; del.setAttribute('aria-label','Delete task'); del.addEventListener('click', function(){ deleteTask(task.id); }); controls.appendChild(del);
    }
    header.appendChild(controls);
    card.appendChild(header);

    // Subtasks wrapper & controls
    var subWrap=document.createElement('div'); var isOpen = !task.collapsed; subWrap.className='subtasks'+(isOpen?' open':'');
    var footerCtl=document.createElement('div'); footerCtl.className='row center'; footerCtl.style.marginTop='8px';
    var btn=document.createElement('button'); btn.className='icon-btn';
    if(task.subtasks.length===0){
      btn.textContent = task.collapsed ? '＋' : '▾';
      btn.setAttribute('aria-label', task.collapsed ? 'Add first subtask' : 'Collapse');
      btn.addEventListener('click', function(){ if(task.collapsed) expandToAdd(task.id); else collapseCard(task.id); });
    } else {
      btn.textContent = task.collapsed ? '▶' : '▼';
      btn.setAttribute('aria-label', task.collapsed ? 'Expand subtasks' : 'Collapse subtasks');
      btn.addEventListener('click', function(){ toggleCollapse(task.id); });
    }
    footerCtl.appendChild(btn);
    if(task.subtasks.length>0 && task.collapsed){ var cnt=document.createElement('span'); cnt.className='muted small'; cnt.textContent=' ('+task.subtasks.length+')'; footerCtl.appendChild(cnt); }

    var adder=document.createElement('div'); adder.className='row'; adder.style.marginTop='8px'; adder.style.display = (!task.collapsed) ? 'flex' : 'none';
    var subInput=document.createElement('input'); subInput.type='text'; subInput.placeholder='Add subtask...'; subInput.id='subInput-'+task.id; subInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ addSubtask(task.id); } });
    var subBtn=document.createElement('button'); subBtn.className='icon-btn'; subBtn.textContent='＋'; subBtn.setAttribute('aria-label','Add subtask'); subBtn.addEventListener('click', function(){ addSubtask(task.id); });
    adder.appendChild(subInput); adder.appendChild(subBtn);

    var list=document.createElement('div'); list.id='subs-'+task.id; list.style.display = task.collapsed ? 'none' : 'block';
    for(var j=0;j<task.subtasks.length;j++){
      var st=task.subtasks[j];
      var isActive = activeRef && activeRef.type==='sub' && activeRef.taskId===task.id && activeRef.subId===st.id && st.startTime;
      var dur=st.duration; if(isActive){ dur += Math.floor((Date.now()-st.startTime)/1000); }
      var row=document.createElement('div'); row.className='subtask '+st.status;
      var l=document.createElement('div'); var ttl=document.createElement('div'); ttl.className='title-line'+(st.status==='completed'?' completed':''); var strong=document.createElement('strong'); strong.textContent=st.name; ttl.appendChild(strong); l.appendChild(ttl); var tw=document.createElement('div'); tw.className='muted'; var ts=document.createElement('span'); ts.className='time'+(st.status==='completed'?' small':''); ts.id='st-'+task.id+'-'+st.id; ts.textContent=fmt(dur); tw.appendChild(ts); l.appendChild(tw); row.appendChild(l);
      var sc=document.createElement('div'); sc.className='sub-controls';
      if(st.status==='pending'){ var s1=document.createElement('button'); s1.className='btn green'; s1.textContent='▶'; s1.setAttribute('aria-label','Start subtask'); s1.addEventListener('click', (function(tid,sid){ return function(){ startSubtask(tid, sid); }; })(task.id, st.id)); sc.appendChild(s1); }
      if(st.status==='in-progress'){ var s2=document.createElement('button'); s2.className='btn red'; s2.textContent='■'; s2.setAttribute('aria-label','Stop subtask'); s2.addEventListener('click', (function(tid,sid){ return function(){ stopSubtask(tid, sid); }; })(task.id, st.id)); sc.appendChild(s2); }
      if(st.status==='completed'){ var s3=document.createElement('button'); s3.className='icon-btn gray'; s3.textContent='↺'; s3.setAttribute('aria-label','Reset subtask'); s3.addEventListener('click', (function(tid,sid){ return function(){ resetSubtask(tid, sid); }; })(task.id, st.id)); sc.appendChild(s3); }
      var s4=document.createElement('button'); s4.className='icon-btn gray'; s4.textContent='✕'; s4.setAttribute('aria-label','Delete subtask'); s4.addEventListener('click', (function(tid,sid){ return function(){ deleteSubtask(tid, sid); }; })(task.id, st.id)); sc.appendChild(s4);
      row.appendChild(sc);
      list.appendChild(row);
    }

    subWrap.appendChild(footerCtl);
    subWrap.appendChild(adder);
    subWrap.appendChild(list);
    card.appendChild(subWrap);

    host.appendChild(card);
  });

  var anyCompletedSub = tasks.some(function(t){ return t.subtasks.some(function(s){return s.status==='completed'}); });
  var anyCompletedParent = tasks.some(function(t){ return !hasSubtasks(t) && t.parent.status==='completed'; });
  document.getElementById('footerBar').style.display = (anyCompletedSub || anyCompletedParent) ? 'block' : 'none';
}

// Boot wiring
document.getElementById('addTaskBtn').addEventListener('click', function(){ addTask(); });
document.getElementById('taskInput').addEventListener('keydown', function(e){ if(e.key==='Enter'){ addTask(); } });
document.getElementById('clearAllBtn').addEventListener('click', function(){ clearAllCompleted(); });

// PWA: register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}

render();
