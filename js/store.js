/**
 * store.js
 * Dummy state management for the Banking Management System.
 * Persists data to localStorage to simulate a backend.
 */

const Store = {
    // Keys for localStorage
    USER_KEY: 'bms_user',
    TRANSACTIONS_KEY: 'bms_transactions',
    ACCOUNTS_KEY: 'bms_accounts',

    // Initial dummy data
    initData: {
        user: {
            id: 'u123',
            name: 'Sarah Jenkins',
            email: 'sarah.j@example.com',
            lastLogin: new Date().toISOString()
        },
        accounts: [
            { id: 'acc1', type: 'Checking', name: 'Luminous Checking', balance: 14250.75, currency: 'USD', number: '**** 4589' },
            { id: 'acc2', type: 'Savings', name: 'High-Yield Savings', balance: 45000.00, currency: 'USD', number: '**** 9201' }
        ],
        transactions: [
            { id: 'tx1', type: 'credit', amount: 3200.00, desc: 'Salary Deposit - Tech Corp', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), accountId: 'acc1', category: 'Income', status: 'Completed' },
            { id: 'tx2', type: 'debit', amount: 120.50, desc: 'Whole Foods Market', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), accountId: 'acc1', category: 'Groceries', status: 'Completed' },
            { id: 'tx3', type: 'debit', amount: 45.00, desc: 'Uber Ride', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), accountId: 'acc1', category: 'Transport', status: 'Completed' },
            { id: 'tx4', type: 'debit', amount: 2500.00, desc: 'Apartment Rent', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), accountId: 'acc1', category: 'Housing', status: 'Completed' },
            { id: 'tx5', type: 'credit', amount: 150.00, desc: 'Venmo - Dinner Split', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), accountId: 'acc1', category: 'Transfer', status: 'Completed' }
        ]
    },

    // Initialize store if empty
    init() {
        if (!localStorage.getItem(this.USER_KEY)) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(this.initData.user));
            localStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(this.initData.accounts));
            localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(this.initData.transactions));
        }
    },

    // Getters
    getUser() {
        return JSON.parse(localStorage.getItem(this.USER_KEY));
    },

    getAccounts() {
        return JSON.parse(localStorage.getItem(this.ACCOUNTS_KEY)) || [];
    },

    getTransactions() {
        return JSON.parse(localStorage.getItem(this.TRANSACTIONS_KEY)) || [];
    },
    
    getTotalBalance() {
        const accounts = this.getAccounts();
        return accounts.reduce((total, acc) => total + acc.balance, 0);
    },

    // Setters / Actions
    addTransaction(transaction) {
        const transactions = this.getTransactions();
        const accounts = this.getAccounts();
        
        // Add ID and Date to new transaction
        const newTx = {
            id: 'tx' + Date.now(),
            date: new Date().toISOString(),
            status: 'Completed',
            ...transaction
        };
        
        transactions.unshift(newTx);
        localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
        
        // Update account balance
        const accountIndex = accounts.findIndex(acc => acc.id === newTx.accountId);
        if (accountIndex !== -1) {
            if (newTx.type === 'credit') {
                accounts[accountIndex].balance += newTx.amount;
            } else if (newTx.type === 'debit') {
                accounts[accountIndex].balance -= newTx.amount;
            }
            localStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
        }
        
        return newTx;
    },
    
    // Auth
    login(email, password) {
        // Dummy login - accepts any valid looking email for demonstration
        if (email && email.includes('@')) {
            this.init(); // ensure data is populated
            localStorage.setItem('bms_auth', 'true');
            return true;
        }
        return false;
    },
    
    logout() {
        localStorage.removeItem('bms_auth');
    },
    
    isAuthenticated() {
        return localStorage.getItem('bms_auth') === 'true';
    },

    resetData() {
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.ACCOUNTS_KEY);
        localStorage.removeItem(this.TRANSACTIONS_KEY);
        localStorage.removeItem('bms_auth');
        this.init();
    }
};

// Auto-initialize on load
Store.init();
