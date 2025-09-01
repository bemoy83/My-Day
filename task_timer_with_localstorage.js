
<script>
  let tasks = [];
  let activeTaskId = null;
  let timerInterval = null;

  // Load tasks from localStorage on startup
  window.onload = function() {
    const saved = localStorage.getItem('taskList');
    if (saved) {
      tasks = JSON.parse(saved);
      // Restore active task if any
      const active = tasks.find(t => t.status === 'in-progress');
      if (active) {
        activeTaskId = active.id;
        active.startTime = Date.now() - (active.duration * 1000);
        startTimer();
      }
      renderTasks();
    }
  };

  function saveTasks() {
    localStorage.setItem('taskList', JSON.stringify(tasks));
  }

  function addTask() {
    const name = document.getElementById('taskInput').value.trim();
    if (!name) return;

    const id = Date.now();
    tasks.push({ id, name, startTime: null, duration: 0, status: 'pending' });
    document.getElementById('taskInput').value = '';
    saveTasks();
    renderTasks();
  }

  function activateTask(id) {
    const newTask = tasks.find(t => t.id === id);
    if (newTask.status === 'completed') return;

    if (activeTaskId !== null && activeTaskId !== id) {
      const currentTask = tasks.find(t => t.id === activeTaskId);
      if (currentTask && currentTask.status === 'in-progress') {
        completeTask(activeTaskId);
      }
    }

    newTask.status = 'in-progress';
    newTask.startTime = Date.now();
    activeTaskId = id;
    startTimer();
    saveTasks();
    renderTasks();
  }

  function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task && task.status === 'in-progress') {
      task.duration += Math.floor((Date.now() - task.startTime) / 1000);
      task.status = 'completed';
      task.startTime = null;
      activeTaskId = null;
      clearInterval(timerInterval);
      saveTasks();
    }
  }

  function stopTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task && task.status === 'in-progress') {
      task.duration += Math.floor((Date.now() - task.startTime) / 1000);
      task.status = 'pending';
      task.startTime = null;
      activeTaskId = null;
      clearInterval(timerInterval);
      saveTasks();
      renderTasks();
    }
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      renderTasks();
    }, 1000);
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  function renderTasks() {
    const container = document.getElementById('taskList');
    container.innerHTML = '';
    tasks.forEach(task => {
      const div = document.createElement('div');
      div.className = `task ${task.status}`;
      let duration = task.duration;
      if (task.status === 'in-progress') {
        duration += Math.floor((Date.now() - task.startTime) / 1000);
      }
      div.innerHTML = `
        <div>
          <strong>${task.name}</strong><br/>
          ⏱ ${formatTime(duration)}
        </div>
        ${task.status === 'pending' ? `<button class="small-btn" onclick="activateTask(${task.id})">Start</button>` : ''}
        ${task.status === 'in-progress' ? `<button class="small-btn" onclick="stopTask(${task.id})">Stop</button>` : ''}
      `;
      container.appendChild(div);
    });
  }
</script>
