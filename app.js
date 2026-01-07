// ============================================
// 🔥 CONFIGURATION FIREBASE
// ============================================
// ÉTAPE 1: Va sur https://console.firebase.google.com
// ÉTAPE 2: Crée un nouveau projet (gratuit)
// ÉTAPE 3: Active "Realtime Database" 
// ÉTAPE 4: Copie ta config ici ⬇️

const firebaseConfig = {
    apiKey: "AIzaSyAhgiDJCYPLw4X2_CDyNy8ml5awBloEEZo",
  authDomain: "to-do-list-5b3e7.firebaseapp.com",
  databaseURL: "https://to-do-list-5b3e7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "to-do-list-5b3e7",
  storageBucket: "to-do-list-5b3e7.firebasestorage.app",
  messagingSenderId: "140900821878",
  appId: "1:140900821878:web:872c4068c85eae50eb2857"
};

// ============================================
// Variables globales
// ============================================
let currentUser = null;
let database = null;
let tasksRef = null;
let presenceRef = null;
let currentFilter = 'all';
let currentPriorityFilter = 'all';
let allTasks = [];

// ============================================
// Initialisation
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    setupEventListeners();
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        selectUser(savedUser);
    }
});

function initFirebase() {
    const statusEl = document.getElementById('connection-status');
    const statusText = statusEl.querySelector('.status-text');
    
    try {
        if (firebaseConfig.apiKey === "REMPLACE_MOI") {
            statusText.textContent = "⚠️ Configure Firebase !";
            statusEl.classList.add('error');
            return;
        }
        
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        tasksRef = database.ref('shared_tasks');
        presenceRef = database.ref('presence');
        
        database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                statusText.textContent = "✅ Connecté en temps réel !";
                statusEl.classList.remove('error');
                statusEl.classList.add('connected');
            } else {
                statusText.textContent = "🔄 Reconnexion...";
                statusEl.classList.remove('connected');
            }
        });
        
        console.log('✅ Firebase initialisé !');
        
    } catch (error) {
        console.error('❌ Erreur Firebase:', error);
        statusText.textContent = "❌ Erreur de connexion";
        statusEl.classList.add('error');
    }
}

function setupEventListeners() {
    // Formulaire
    document.getElementById('task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addTask();
    });

    // Filtres principaux (par personne)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Filtres par priorité
    document.querySelectorAll('.priority-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.priority-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPriorityFilter = btn.dataset.priority;
            renderTasks();
        });
    });
}

// ============================================
// Gestion des utilisateurs
// ============================================
function selectUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', user);

    document.getElementById('user-selection').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    const badge = document.getElementById('current-user-badge');
    badge.textContent = `Connecté: ${user}`;
    badge.className = `current-user ${user.toLowerCase()}`;

    document.body.classList.remove('eric-theme', 'noah-theme');
    document.body.classList.add(`${user.toLowerCase()}-theme`);

    document.getElementById('assign-select').value = user;

    if (database) {
        listenToTasks();
        updatePresence(true);
        listenToPresence();
    }

    showToast(`Bienvenue ${user} ! 👋`);
}

function logout() {
    if (database && currentUser) {
        updatePresence(false);
    }
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    document.getElementById('app').classList.add('hidden');
    document.getElementById('user-selection').classList.remove('hidden');
    
    if (tasksRef) tasksRef.off();
    if (presenceRef) presenceRef.off();
}

// ============================================
// Présence en ligne
// ============================================
function updatePresence(online) {
    if (!presenceRef || !currentUser) return;
    
    const userPresenceRef = presenceRef.child(currentUser.toLowerCase());
    
    if (online) {
        userPresenceRef.set({
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        
        userPresenceRef.onDisconnect().set({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    } else {
        userPresenceRef.set({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

function listenToPresence() {
    presenceRef.on('value', (snapshot) => {
        const presence = snapshot.val() || {};
        
        const ericStatus = document.getElementById('eric-status');
        if (presence.eric?.online) {
            ericStatus.classList.add('online');
            ericStatus.classList.remove('offline');
        } else {
            ericStatus.classList.remove('online');
            ericStatus.classList.add('offline');
        }
        
        const noahStatus = document.getElementById('noah-status');
        if (presence.noah?.online) {
            noahStatus.classList.add('online');
            noahStatus.classList.remove('offline');
        } else {
            noahStatus.classList.remove('online');
            noahStatus.classList.add('offline');
        }
    });
}

// ============================================
// Gestion des tâches
// ============================================
function addTask() {
    if (!database) {
        showToast('❌ Firebase non configuré !');
        return;
    }
    
    const input = document.getElementById('task-input');
    const priority = document.getElementById('priority-select').value;
    const assignedTo = document.getElementById('assign-select').value;
    const text = input.value.trim();

    if (!text) return;

    const task = {
        text: text,
        priority: priority,
        assignedTo: assignedTo,
        completed: false,
        createdBy: currentUser,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    tasksRef.push(task)
        .then(() => {
            input.value = '';
            showToast('✅ Tâche ajoutée !');
        })
        .catch(error => {
            console.error('Erreur:', error);
            showToast('❌ Erreur lors de l\'ajout');
        });
}

function toggleTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
        tasksRef.child(taskId).update({ 
            completed: !task.completed,
            completedBy: !task.completed ? currentUser : null,
            completedAt: !task.completed ? firebase.database.ServerValue.TIMESTAMP : null
        });
    }
}

function deleteTask(taskId) {
    if (confirm('Supprimer cette tâche ?')) {
        tasksRef.child(taskId).remove()
            .then(() => showToast('🗑️ Tâche supprimée !'))
            .catch(error => showToast('❌ Erreur'));
    }
}

// ============================================
// Écoute temps réel Firebase
// ============================================
function listenToTasks() {
    tasksRef.orderByChild('createdAt').on('value', (snapshot) => {
        allTasks = [];
        
        snapshot.forEach((child) => {
            allTasks.push({
                id: child.key,
                ...child.val()
            });
        });
        
        allTasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        
        renderTasks();
    });
}

// ============================================
// Compteurs de priorité
// ============================================
function updatePriorityCounts() {
    const notCompleted = allTasks.filter(t => !t.completed);
    
    const highCount = notCompleted.filter(t => t.priority === 'high').length;
    const mediumCount = notCompleted.filter(t => t.priority === 'medium').length;
    const lowCount = notCompleted.filter(t => t.priority === 'low').length;
    
    const buttons = document.querySelectorAll('.priority-filter-btn');
    buttons.forEach(btn => {
        const priority = btn.dataset.priority;
        let count = 0;
        
        switch(priority) {
            case 'high': count = highCount; break;
            case 'medium': count = mediumCount; break;
            case 'low': count = lowCount; break;
            case 'all': count = notCompleted.length; break;
        }
        
        // Supprimer ancien compteur
        const oldCount = btn.querySelector('.priority-count');
        if (oldCount) oldCount.remove();
        
        // Ajouter nouveau compteur
        if (count > 0) {
            const countSpan = document.createElement('span');
            countSpan.className = 'priority-count';
            countSpan.textContent = count;
            btn.appendChild(countSpan);
        }
    });
}

// ============================================
// Rendu
// ============================================
function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    const emptyState = document.getElementById('empty-state');
    
    // Filtrer par personne/statut
    let filtered = [...allTasks];
    
    switch(currentFilter) {
        case 'eric':
            filtered = allTasks.filter(t => 
                t.createdBy === 'Eric' || t.assignedTo === 'Eric'
            );
            break;
        case 'noah':
            filtered = allTasks.filter(t => 
                t.createdBy === 'Noah' || t.assignedTo === 'Noah'
            );
            break;
        case 'completed':
            filtered = allTasks.filter(t => t.completed);
            break;
    }

    // Filtrer par priorité
    if (currentPriorityFilter !== 'all') {
        filtered = filtered.filter(t => t.priority === currentPriorityFilter);
    }

    // Stats
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    document.getElementById('tasks-count').textContent = `${total} tâche${total !== 1 ? 's' : ''}`;
    document.getElementById('completed-count').textContent = `${completed} complétée${completed !== 1 ? 's' : ''}`;

    // Mettre à jour compteurs priorité
    updatePriorityCounts();

    // Vide ?
    if (filtered.length === 0) {
        tasksList.innerHTML = '';
        emptyState.classList.remove('hidden');
        
        const emptyText = emptyState.querySelector('p');
        if (currentPriorityFilter !== 'all') {
            const labels = { high: 'haute', medium: 'moyenne', low: 'basse' };
            emptyText.textContent = `Aucune tâche ${labels[currentPriorityFilter]} priorité`;
        } else {
            emptyText.textContent = 'Aucune tâche pour le moment';
        }
        return;
    }
    emptyState.classList.add('hidden');

    // Trier par priorité puis par date
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // Générer HTML
    const priorityLabels = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
    
    tasksList.innerHTML = filtered.map(task => `
        <li class="task-item ${task.completed ? 'completed' : ''} by-${task.createdBy?.toLowerCase()} priority-${task.priority}" data-id="${task.id}">
            <div class="task-checkbox" onclick="toggleTask('${task.id}')">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="priority-badge ${task.priority}">${priorityLabels[task.priority]}</span>
                    <span class="created-by ${task.createdBy?.toLowerCase()}">Par ${task.createdBy}</span>
                    <span class="assigned-to">→ ${task.assignedTo}</span>
                    <span>${formatDate(task.createdAt)}</span>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteTask('${task.id}')">🗑️</button>
        </li>
    `).join('');
}

// ============================================
// Utilitaires
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

window.addEventListener('beforeunload', () => {
    if (currentUser) updatePresence(false);
});