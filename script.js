class TaskManager {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    this.editIndex = null;
    this.currentFilter = 'all';
    this.currentSort = 'newest';
    
    this.initializeElements();
    this.bindEvents();
    this.renderTasks();
  }

  initializeElements() {
    this.taskForm = document.getElementById('task-form');
    this.taskInput = document.getElementById('task-input');
    this.prioritySelect = document.getElementById('priority-select');
    this.dueDateInput = document.getElementById('due-date');
    this.taskList = document.getElementById('task-list');
    this.progressBar = document.getElementById('progress-bar');
    this.progressPercent = document.getElementById('progress-percent');
    this.taskStats = document.getElementById('task-stats');
    this.emptyState = document.getElementById('empty-state');
    this.sortSelect = document.getElementById('sort-select');
    
    // Modal elements
    this.modal = document.getElementById('task-modal');
    this.modalForm = document.getElementById('modal-form');
    this.modalTaskInput = document.getElementById('modal-task-input');
    this.modalPriority = document.getElementById('modal-priority');
    this.modalDueDate = document.getElementById('modal-due-date');
    this.modalNotes = document.getElementById('modal-notes');
    this.closeModal = document.querySelector('.close');
    this.cancelButton = document.querySelector('.cancel');
  }

  bindEvents() {
    // Form submission
    this.taskForm.onsubmit = (e) => this.handleTaskSubmission(e);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => this.setFilter(btn.dataset.filter, btn);
    });
    
    // Sort select
    this.sortSelect.onchange = (e) => this.setSortOrder(e.target.value);
    
    // Bulk actions
    document.getElementById('select-all').onclick = () => this.selectAllTasks();
    document.getElementById('clear-completed').onclick = () => this.clearCompleted();
    document.getElementById('export-tasks').onclick = () => this.exportTasks();
    document.getElementById('import-tasks').onclick = () => this.importTasks();
    document.getElementById('import-file').onchange = (e) => this.handleFileImport(e);
    
    // Modal events
    this.modalForm.onsubmit = (e) => this.handleModalSubmission(e);
    this.closeModal.onclick = () => this.closeTaskModal();
    this.cancelButton.onclick = () => this.closeTaskModal();
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.closeTaskModal();
    };
  }

  handleTaskSubmission(e) {
    e.preventDefault();
    const text = this.taskInput.value.trim();
    const priority = this.prioritySelect.value;
    const dueDate = this.dueDateInput.value;
    
    if (!text) return;

    const newTask = {
      id: Date.now(),
      text,
      priority,
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      notes: ''
    };

    this.tasks.push(newTask);
    this.saveTasks();
    this.renderTasks();
    this.resetForm();
  }

  handleModalSubmission(e) {
    e.preventDefault();
    if (this.editIndex === null) return;

    const task = this.tasks[this.editIndex];
    task.text = this.modalTaskInput.value.trim();
    task.priority = this.modalPriority.value;
    task.dueDate = this.modalDueDate.value || null;
    task.notes = this.modalNotes.value.trim();

    this.saveTasks();
    this.renderTasks();
    this.closeTaskModal();
  }

  resetForm() {
    this.taskInput.value = '';
    this.prioritySelect.value = 'medium';
    this.dueDateInput.value = '';
  }

  setFilter(filter, buttonElement) {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    this.renderTasks();
  }

  setSortOrder(sortOrder) {
    this.currentSort = sortOrder;
    this.renderTasks();
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];

    // Apply filter
    switch (this.currentFilter) {
      case 'pending':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
    }

    // Apply sort
    switch (this.currentSort) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
      default: // newest
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return filtered;
  }

  renderTasks() {
    const filteredTasks = this.getFilteredTasks();
    this.taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
      this.emptyState.style.display = 'block';
      this.taskList.style.display = 'none';
    } else {
      this.emptyState.style.display = 'none';
      this.taskList.style.display = 'block';
      
      filteredTasks.forEach((task) => {
        const taskIndex = this.tasks.findIndex(t => t.id === task.id);
        this.createTaskElement(task, taskIndex);
      });
    }

    this.updateProgress();
  }

  createTaskElement(task, index) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority`;
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && !task.completed;
    
    li.innerHTML = `
      <div class="task-content">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="task-details">
          <div class="task-text">${this.escapeHtml(task.text)}</div>
          <div class="task-meta">
            <span class="priority-badge ${task.priority}">${task.priority}</span>
            ${task.dueDate ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">
              <i class="fas fa-calendar"></i> ${this.formatDate(task.dueDate)}
            </span>` : ''}
            ${task.notes ? `<span><i class="fas fa-sticky-note"></i> Notes</span>` : ''}
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="edit" title="Edit Task">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete" title="Delete Task">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    // Event listeners
    const checkbox = li.querySelector('.task-checkbox');
    const editBtn = li.querySelector('.edit');
    const deleteBtn = li.querySelector('.delete');

    checkbox.onchange = () => this.toggleComplete(index);
    editBtn.onclick = () => this.openEditModal(index);
    deleteBtn.onclick = () => this.deleteTask(index);

    this.taskList.appendChild(li);
  }

  toggleComplete(index) {
    this.tasks[index].completed = !this.tasks[index].completed;
    this.saveTasks();
    this.renderTasks();
  }

  openEditModal(index) {
    this.editIndex = index;
    const task = this.tasks[index];
    
    this.modalTaskInput.value = task.text;
    this.modalPriority.value = task.priority;
    this.modalDueDate.value = task.dueDate || '';
    this.modalNotes.value = task.notes || '';
    
    this.modal.style.display = 'block';
  }

  closeTaskModal() {
    this.modal.style.display = 'none';
    this.editIndex = null;
  }

  deleteTask(index) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.tasks.splice(index, 1);
      this.saveTasks();
      this.renderTasks();
    }
  }

  selectAllTasks() {
    const allCompleted = this.tasks.every(task => task.completed);
    this.tasks.forEach(task => task.completed = !allCompleted);
    this.saveTasks();
    this.renderTasks();
  }

  clearCompleted() {
    if (confirm('Are you sure you want to delete all completed tasks?')) {
      this.tasks = this.tasks.filter(task => !task.completed);
      this.saveTasks();
      this.renderTasks();
    }
  }

  exportTasks() {
    const dataStr = JSON.stringify(this.tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importTasks() {
    document.getElementById('import-file').click();
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedTasks = JSON.parse(event.target.result);
        if (Array.isArray(importedTasks)) {
          this.tasks = [...this.tasks, ...importedTasks];
          this.saveTasks();
          this.renderTasks();
          alert('Tasks imported successfully!');
        } else {
          alert('Invalid file format');
        }
      } catch (error) {
        alert('Error reading file');
      }
    };
    reader.readAsText(file);
  }

  updateProgress() {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(task => task.completed).length;
    const percentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    this.progressBar.value = percentage;
    this.progressPercent.textContent = `${percentage}%`;
    this.taskStats.textContent = `${completedTasks} of ${totalTasks} tasks completed`;
  }

  saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new TaskManager();
});
