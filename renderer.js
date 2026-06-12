const { shell } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const leftPanel = document.getElementById('leftPanel');
    const hidePanelBtn = document.getElementById('hidePanelBtn');
    const showPanelBtn = document.getElementById('showPanelBtn');
    
    const taskForm = document.getElementById('taskForm');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editingTaskIdInput = document.getElementById('editingTaskId');
    
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const taskCount = document.getElementById('taskCount');

    const includeTimeCheckbox = document.getElementById('includeTime');
    const timeGroup = document.getElementById('timeGroup');
    const taskTimeInput = document.getElementById('taskTime');

    let tasks = JSON.parse(localStorage.getItem('tasksManager_tasks')) || [];
    
    // Inizializza SortableJS per Drag & Drop
    Sortable.create(taskList, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: function () {
            // Aggiorna l'array tasks in base al nuovo ordine nel DOM
            const newOrder = Array.from(taskList.children).map(card => card.dataset.id);
            tasks = newOrder.map(id => tasks.find(t => t.id === id)).filter(Boolean);
            localStorage.setItem('tasksManager_tasks', JSON.stringify(tasks));
        }
    });

    // Toggle Orario
    includeTimeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            timeGroup.style.display = 'flex';
            taskTimeInput.required = true;
        } else {
            timeGroup.style.display = 'none';
            taskTimeInput.required = false;
            taskTimeInput.value = '';
        }
    });

    // Imposta Data Odierna predefinita
    function setDefaultDate() {
        const today = new Date();
        document.getElementById('taskDay').value = String(today.getDate()).padStart(2, '0');
        document.getElementById('taskMonth').value = String(today.getMonth() + 1).padStart(2, '0');
    }

    // Toggle Pannello
    hidePanelBtn.addEventListener('click', () => {
        leftPanel.classList.add('hidden');
        showPanelBtn.classList.remove('hidden');
    });

    showPanelBtn.addEventListener('click', () => {
        leftPanel.classList.remove('hidden');
        showPanelBtn.classList.add('hidden');
    });

    // Form Submit (Aggiungi o Modifica)
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const editingId = editingTaskIdInput.value;
        const name = document.getElementById('taskName').value;
        const subtitle = document.getElementById('taskSubtitle').value;
        const importance = document.getElementById('taskImportance').value;
        
        const day = document.getElementById('taskDay').value.padStart(2, '0');
        const monthSelect = document.getElementById('taskMonth');
        const monthText = monthSelect.options[monthSelect.selectedIndex].text;
        const monthValue = monthSelect.value;
        
        const hasTime = includeTimeCheckbox.checked;
        const time = taskTimeInput.value;

        // Formatta la scadenza
        let deadlineDisplay = `${day} ${monthText}`;
        if (hasTime && time) {
            deadlineDisplay += ` - ${time}`;
        }

        if (editingId) {
            // Modalità Modifica
            const taskIndex = tasks.findIndex(t => t.id === editingId);
            if (taskIndex !== -1) {
                tasks[taskIndex] = {
                    ...tasks[taskIndex],
                    name,
                    subtitle,
                    importance,
                    day,
                    monthValue,
                    hasTime,
                    time,
                    deadline: deadlineDisplay
                };
            }
            resetForm();
        } else {
            // Modalità Aggiunta
            const newTask = {
                id: Date.now().toString(),
                name,
                subtitle,
                importance,
                day,
                monthValue,
                hasTime,
                time,
                deadline: deadlineDisplay
            };
            tasks.push(newTask);
            resetForm();
        }

        localStorage.setItem('tasksManager_tasks', JSON.stringify(tasks));
        renderTasks();
    });

    function resetForm() {
        taskForm.reset();
        document.getElementById('taskImportance').value = 'medium';
        editingTaskIdInput.value = '';
        formTitle.textContent = 'Nuova Task';
        submitBtn.textContent = 'Aggiungi Task';
        cancelEditBtn.style.display = 'none';
        
        includeTimeCheckbox.checked = false;
        timeGroup.style.display = 'none';
        taskTimeInput.required = false;

        setDefaultDate();
    }

    cancelEditBtn.addEventListener('click', resetForm);

    window.editTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        // Apri pannello se nascosto
        leftPanel.classList.remove('hidden');
        showPanelBtn.classList.add('hidden');

        editingTaskIdInput.value = task.id;
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskSubtitle').value = task.subtitle || '';
        document.getElementById('taskImportance').value = task.importance;
        document.getElementById('taskDay').value = task.day || '';
        if (task.monthValue) {
            document.getElementById('taskMonth').value = task.monthValue;
        }

        if (task.hasTime) {
            includeTimeCheckbox.checked = true;
            timeGroup.style.display = 'flex';
            taskTimeInput.required = true;
            taskTimeInput.value = task.time || '';
        } else {
            includeTimeCheckbox.checked = false;
            timeGroup.style.display = 'none';
            taskTimeInput.required = false;
            taskTimeInput.value = '';
        }

        formTitle.textContent = 'Modifica Task';
        submitBtn.textContent = 'Salva Modifiche';
        cancelEditBtn.style.display = 'inline-block';
    };

    window.deleteTask = function(id) {
        tasks = tasks.filter(task => task.id !== id);
        localStorage.setItem('tasksManager_tasks', JSON.stringify(tasks));
        renderTasks();
        if (editingTaskIdInput.value === id) {
            resetForm();
        }
    };

    window.addToCalendar = function(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const currentYear = new Date().getFullYear();
        // Costruisci date (YYYYMMDD) e time (HHMMSS) per GCal format
        let startDate = `${currentYear}${task.monthValue}${task.day}`;
        let endDate = startDate; // Se tutto il giorno
        
        let datesParam = `${startDate}/${startDate}`;
        
        if (task.hasTime && task.time) {
            const timeNoColon = task.time.replace(':', '');
            // Formato ISO basico per GCal: YYYYMMDDTHHMMSS
            startDate = `${currentYear}${task.monthValue}${task.day}T${timeNoColon}00`;
            
            // Per comodità facciamo durare l'evento 1 ora per default
            let endHour = parseInt(task.time.split(':')[0]) + 1;
            let endHourStr = String(endHour).padStart(2, '0');
            // se sfora mezzanotte (24) c'è un edge case, ma per semplicità:
            if(endHour >= 24) endHourStr = '23'; 
            const endTime = `${endHourStr}${task.time.split(':')[1]}00`;
            endDate = `${currentYear}${task.monthValue}${task.day}T${endTime}`;
            
            datesParam = `${startDate}/${endDate}`;
        }

        const title = encodeURIComponent(task.name);
        const details = encodeURIComponent(task.subtitle || '');
        
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${datesParam}`;
        shell.openExternal(gcalUrl);
    };

    window.addNativeCalendar = function(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const currentYear = new Date().getFullYear();
        let startDate = `${currentYear}${task.monthValue}${task.day}`;
        let endDate = startDate;
        
        let dtStart = `DTSTART;VALUE=DATE:${startDate}`;
        let dtEnd = `DTEND;VALUE=DATE:${startDate}`;
        
        if (task.hasTime && task.time) {
            const timeNoColon = task.time.replace(':', '');
            startDate = `${currentYear}${task.monthValue}${task.day}T${timeNoColon}00`;
            let endHour = parseInt(task.time.split(':')[0]) + 1;
            let endHourStr = String(endHour).padStart(2, '0');
            if(endHour >= 24) endHourStr = '23'; 
            const endTime = `${endHourStr}${task.time.split(':')[1]}00`;
            endDate = `${currentYear}${task.monthValue}${task.day}T${endTime}`;
            
            dtStart = `DTSTART:${startDate}`;
            dtEnd = `DTEND:${endDate}`;
        }

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
${dtStart}
${dtEnd}
SUMMARY:${task.name}
DESCRIPTION:${task.subtitle || ''}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${task.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    function renderTasks() {
        taskList.innerHTML = '';

        if (tasks.length === 0) {
            emptyState.style.display = 'flex';
            taskCount.textContent = '0 task totali';
            return;
        }

        emptyState.style.display = 'none';
        taskCount.textContent = `${tasks.length} task total${tasks.length === 1 ? 'e' : 'i'}`;

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.dataset.id = task.id; // Necessario per il sortable

            let importanceLabel = '';
            if (task.importance === 'low') importanceLabel = 'Bassa';
            if (task.importance === 'medium') importanceLabel = 'Media';
            if (task.importance === 'high') importanceLabel = 'Alta';

            card.innerHTML = `
                <div class="task-content-wrapper">
                    <div class="drag-handle" title="Trascina per riordinare">
                        <i data-feather="more-vertical"></i>
                    </div>
                    <div class="task-content">
                        <div class="task-title">${task.name}</div>
                        ${task.subtitle ? `<div class="task-subtitle">${task.subtitle}</div>` : ''}
                        <div class="task-meta">
                            <span class="badge badge-${task.importance}">${importanceLabel}</span>
                            ${task.deadline ? `
                            <div class="date-badge">
                                <i data-feather="calendar"></i>
                                <span>${task.deadline}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="action-btn calendar-google" onclick="addToCalendar('${task.id}')" title="Aggiungi a Google Calendar">
                        <i data-feather="cloud"></i>
                    </button>
                    <button class="action-btn calendar-native" onclick="addNativeCalendar('${task.id}')" title="Aggiungi al Calendario Nativo (Apple, Outlook...)">
                        <i data-feather="calendar"></i>
                    </button>
                    <button class="action-btn edit" onclick="editTask('${task.id}')" title="Modifica Task">
                        <i data-feather="edit-2"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteTask('${task.id}')" title="Elimina Task">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            `;
            
            taskList.appendChild(card);
        });

        if (window.feather) {
            feather.replace();
        }
    }

    // Init
    setDefaultDate();
    renderTasks();
});
