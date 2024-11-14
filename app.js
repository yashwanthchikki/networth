// IndexedDB setup for persistent data
let db;

// Open IndexedDB database
const openDB = () => {
    const request = indexedDB.open('NetworthDB', 1);

    request.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('entries')) {
            db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = function (e) {
        db = e.target.result;
        displayTodayEntries(); // Load entries on startup
    };

    request.onerror = function (e) {
        console.error('Error opening IndexedDB', e);
    };
};

// Add an entry to IndexedDB
const addEntryToDB = (entry) => {
    const transaction = db.transaction(['entries'], 'readwrite');
    const store = transaction.objectStore('entries');
    store.add(entry);

    transaction.oncomplete = function () {
        console.log('Entry added to DB');
    };

    transaction.onerror = function (e) {
        console.error('Error adding entry to DB', e);
    };
};

// Fetch all entries from IndexedDB
const fetchEntriesFromDB = (callback) => {
    const transaction = db.transaction(['entries'], 'readonly');
    const store = transaction.objectStore('entries');
    const request = store.getAll();

    request.onsuccess = function (e) {
        callback(e.target.result);
    };

    request.onerror = function (e) {
        console.error('Error fetching entries from DB', e);
    };
};

// Delete an entry from IndexedDB by ID
const deleteEntryFromDB = (id, callback) => {
    const transaction = db.transaction(['entries'], 'readwrite');
    const store = transaction.objectStore('entries');
    store.delete(id);

    transaction.oncomplete = function () {
        console.log(`Entry with id ${id} deleted from DB`);
        if (callback) callback();
    };

    transaction.onerror = function (e) {
        console.error('Error deleting entry from DB', e);
    };
};

// Update net worth display
const updateNetworth = (networth) => {
    document.getElementById('networthAmount').textContent = networth;
};

// Handle submit action
document.getElementById('submitBtn').addEventListener('click', () => {
    const entryType = document.getElementById('entryType').value;
    const reason = document.getElementById('reason').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!reason || isNaN(amount)) {
        alert('Please fill in all fields correctly.');
        return;
    }

    const currentTime = new Date().toLocaleTimeString();
    const currentDate = new Date().toLocaleDateString();
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    let networth = parseFloat(document.getElementById('networthAmount').textContent);

    if (entryType === 'expense') {
        networth -= amount;
    } else {
        networth += amount;
    }

    const entry = {
        date: currentDate,
        month: currentMonth,
        time: currentTime,
        type: entryType,
        reason: reason,
        amount: amount
    };

    addEntryToDB(entry);
    updateNetworth(networth);

    document.getElementById('reason').value = '';
    document.getElementById('amount').value = '';
    displayTodayEntries(); // Display today's entries immediately after submission
});

// Show statistics based on filter
document.getElementById('showStatsBtn').addEventListener('click', () => {
    const filterAmount = parseFloat(document.getElementById('filterAmount').value);
    const filteredEntries = [];
    const totalSpent = { amount: 0 };

    fetchEntriesFromDB((entries) => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthName = lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

        entries.forEach(entry => {
            if (entry.month === lastMonthName) {
                if (entry.type === 'expense') {
                    totalSpent.amount += entry.amount;
                }
                if (entry.amount > filterAmount) {
                    filteredEntries.push(entry);
                }
            }
        });

        const statsDisplay = document.getElementById('statDisplay');
        statsDisplay.innerHTML = '';

        statsDisplay.innerHTML = `<h3>Total money spent last month: ₹${totalSpent.amount}</h3>`;

        filteredEntries.forEach(entry => {
            const statItem = document.createElement('p');
            statItem.textContent = `${entry.date} ${entry.time}: ${entry.type.toUpperCase()} of ₹${entry.amount} for ${entry.reason}`;
            statsDisplay.appendChild(statItem);
        });
    });
});

// Function to reset entries at midnight (12:00 AM)
function resetEntriesAtMidnight() {
    const now = new Date();
    const currentDateString = now.toLocaleDateString();
    const lastResetDate = localStorage.getItem('lastResetDate');

    if (currentDateString !== lastResetDate) {
        localStorage.setItem('lastResetDate', currentDateString);
        displayTodayEntries();
    }

    const timeUntilMidnight = new Date(now.setHours(24, 0, 0, 0)) - Date.now();
    setTimeout(resetEntriesAtMidnight, timeUntilMidnight);
}

// Display today's entries from IndexedDB
function displayTodayEntries() {
    const todayEntries = [];
    const currentDate = new Date().toLocaleDateString();

    fetchEntriesFromDB((entries) => {
        entries.forEach(entry => {
            if (entry.date === currentDate) {
                todayEntries.push(entry);
            }
        });

        const entriesDisplay = document.getElementById('entriesDisplay');
        entriesDisplay.innerHTML = '';

        if (todayEntries.length === 0) {
            entriesDisplay.innerHTML = '<p>No entries for today.</p>';
        } else {
            todayEntries.forEach(entry => {
                const entryItem = document.createElement('div');
                entryItem.className = 'entry-item';
                entryItem.innerHTML = `${entry.date} ${entry.time}: ${entry.type.toUpperCase()} of ₹${entry.amount} for ${entry.reason} 
                                       <button onclick="deleteEntry(${entry.id})">Delete</button>`;
                entriesDisplay.appendChild(entryItem);
            });
        }
    });
}

// Delete entry and refresh display
function deleteEntry(id) {
    deleteEntryFromDB(id, displayTodayEntries);
}

// Initialize IndexedDB
openDB();

// Display today's entries when the page loads
window.onload = function () {
    displayTodayEntries();
};

// Start the midnight reset check
resetEntriesAtMidnight();
