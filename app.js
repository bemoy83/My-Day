diff --git a/app.js b/app.js
index 24dd5b8093f512c177ac88f74ed2273368eab193..26d2f3b131c6328f522b7c3a2134401f2e79489b 100644
--- a/app.js
+++ b/app.js
@@ -1,30 +1,35 @@
 // ===== State =====
-var tasks = [];
 var activeRef = null; // { type:'task'|'sub', taskId:number, subId?:number }
 var timerInterval = null;
-var nextId = 1; // monotonic id
+var nextId = tasks.reduce(function(max, t){
+  max = Math.max(max, t.id || 0);
+  if (t.subtasks) {
+    t.subtasks.forEach(function(s){ max = Math.max(max, s.id || 0); });
+  }
+  return max;
+}, 0) + 1; // monotonic id
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
diff --git a/app.js b/app.js
index 24dd5b8093f512c177ac88f74ed2273368eab193..26d2f3b131c6328f522b7c3a2134401f2e79489b 100644
--- a/app.js
+++ b/app.js
@@ -107,40 +112,41 @@ function render(){
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
+  localStorage.setItem('tasks', JSON.stringify(tasks));
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
