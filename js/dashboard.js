/**
 * dashboard.js
 * Handles UI binding and interactions for the dashboard page.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Authentication
    if (!Store.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // 2. DOM Elements
    const elements = {
        greetingName: document.getElementById('greetingName'),
        currentDate: document.getElementById('currentDate'),
        userInitials: document.getElementById('userInitials'),
        totalBalance: document.getElementById('totalBalance'),
        accountsContainer: document.getElementById('accountsContainer'),
        transactionsTableBody: document.getElementById('transactionsTableBody'),
        transferForm: document.getElementById('transferForm'),
        transferAccount: document.getElementById('transferAccount'),
        transferAmount: document.getElementById('transferAmount'),
        transferRecipient: document.getElementById('transferRecipient'),
        transferFeedback: document.getElementById('transferFeedback'),
        logoutBtn: document.getElementById('logoutBtn'),
        transactionFilters: document.getElementById('transactionFilters'),
        toastContainer: document.getElementById('toastContainer')
    };

    // State for filtering
    let currentTransactionFilter = 'all';
    let currentAccountFilter = null;

    // 3. Formatters
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    const formatHeaderDate = () => {
        const date = new Date();
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    // 4. Toast Notifications
    const showToast = (title, message, type = 'info') => {
        const toast = document.createElement('div');
        
        let icon = 'info';
        let colorClass = 'text-primary border-primary/20 bg-primary/10';
        if (type === 'success') {
            icon = 'check_circle';
            colorClass = 'text-green-400 border-green-500/20 bg-green-500/10';
        } else if (type === 'error') {
            icon = 'error';
            colorClass = 'text-red-400 border-red-500/20 bg-red-500/10';
        }

        toast.className = `flex items-center gap-3 p-4 rounded-xl border glass-panel animate-[slideIn_0.3s_ease-out] shadow-xl max-w-sm w-full ${colorClass}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            <div>
                <h4 class="font-semibold text-sm">${title}</h4>
                <p class="text-xs opacity-80 mt-0.5">${message}</p>
            </div>
            <button class="ml-auto opacity-60 hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;

        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        });

        elements.toastContainer.appendChild(toast);

        // Auto remove after 5s
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    };

    // Add CSS animations for toast
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // 5. Render Logic
    const renderHeader = () => {
        const user = Store.getUser();
        const hour = new Date().getHours();
        let greeting = 'Good Evening';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 18) greeting = 'Good Afternoon';
        
        elements.greetingName.textContent = `${greeting}, ${user.name.split(' ')[0]}`;
        elements.currentDate.textContent = formatHeaderDate();
        
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        elements.userInitials.textContent = initials;
    };

    const renderBalances = () => {
        elements.totalBalance.textContent = formatCurrency(Store.getTotalBalance());
        
        const accounts = Store.getAccounts();
        elements.accountsContainer.innerHTML = accounts.map(acc => {
            const isSelected = currentAccountFilter === acc.id;
            const borderClass = isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline/20 hover:border-outline/40';
            
            return `
            <div data-account-id="${acc.id}" class="account-card cursor-pointer bg-surface-variant/30 rounded-xl p-4 border transition-all ${borderClass}">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="text-xs text-on-surface-variant">${acc.name}</p>
                        <p class="text-xs text-outline font-mono mt-1">${acc.number}</p>
                    </div>
                    <span class="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
                </div>
                <p class="text-xl font-bold tracking-tight">${formatCurrency(acc.balance)}</p>
            </div>
            `;
        }).join('');

        // Attach click events to account cards
        document.querySelectorAll('.account-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const accountId = e.currentTarget.dataset.accountId;
                if (currentAccountFilter === accountId) {
                    currentAccountFilter = null; // Toggle off
                } else {
                    currentAccountFilter = accountId; // Toggle on
                }
                renderBalances(); // Re-render to update borders
                renderTransactions(); // Re-render to filter transactions
            });
        });
    };

    const renderTransferAccounts = () => {
        const accounts = Store.getAccounts();
        if (!elements.transferAccount) return;
        elements.transferAccount.innerHTML = accounts.map(acc => `
            <option value="${acc.id}">${acc.name} (${formatCurrency(acc.balance)})</option>
        `).join('');
    };

    const getStatusStyle = (status) => {
        if (status === 'Completed') return 'text-green-400 bg-green-400/10 border-green-400/20';
        if (status === 'Pending') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        return 'text-on-surface-variant bg-surface-variant border-outline/20';
    };

    const renderTransactions = () => {
        let transactions = Store.getTransactions();
        
        // Apply Account Filter
        if (currentAccountFilter) {
            transactions = transactions.filter(tx => tx.accountId === currentAccountFilter);
        }

        // Apply Type Filter
        if (currentTransactionFilter !== 'all') {
            transactions = transactions.filter(tx => tx.type === currentTransactionFilter);
        }
        
        if (transactions.length === 0) {
            elements.transactionsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-on-surface-variant">No recent transactions found matching filters.</td>
                </tr>
            `;
            return;
        }

        elements.transactionsTableBody.innerHTML = transactions.map(tx => {
            const isCredit = tx.type === 'credit';
            const amountClass = isCredit ? 'text-green-400' : 'text-on-surface';
            const amountPrefix = isCredit ? '+' : '-';
            
            return `
                <tr class="transaction-row">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center border border-white/5">
                                <span class="material-symbols-outlined text-outline">
                                    ${isCredit ? 'arrow_downward' : 'arrow_upward'}
                                </span>
                            </div>
                            <span class="font-medium">${tx.desc}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-on-surface-variant text-sm">${formatDate(tx.date)}</td>
                    <td class="px-6 py-4 text-on-surface-variant text-sm">${tx.category}</td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(tx.status)}">
                            ${tx.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right font-medium ${amountClass}">
                        ${amountPrefix}${formatCurrency(tx.amount)}
                    </td>
                </tr>
            `;
        }).join('');
    };

    // 6. Actions / Event Listeners
    
    // Transaction Filters
    if (elements.transactionFilters) {
        elements.transactionFilters.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                // Update active state classes
                elements.transactionFilters.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/30', 'active');
                    btn.classList.add('bg-surface-variant/50', 'text-on-surface-variant', 'border-transparent');
                });
                
                e.target.classList.add('bg-primary/20', 'text-primary', 'border-primary/30', 'active');
                e.target.classList.remove('bg-surface-variant/50', 'text-on-surface-variant', 'border-transparent');

                currentTransactionFilter = e.target.dataset.filter;
                renderTransactions();
            }
        });
    }

    // Transfer Form
    elements.transferForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const amount = parseFloat(elements.transferAmount.value);
        const recipient = elements.transferRecipient.value;
        const accountId = elements.transferAccount.value;
        const accounts = Store.getAccounts();
        
        if (!amount || amount <= 0 || !recipient || !accountId) return;

        const selectedAccount = accounts.find(acc => acc.id === accountId);

        if (!selectedAccount) return;

        // Ensure sufficient balance
        if (selectedAccount.balance < amount) {
            showToast("Transfer Failed", "Insufficient funds in the selected account.", "error");
            return;
        }

        // Add dummy debit transaction
        Store.addTransaction({
            type: 'debit',
            amount: amount,
            desc: `Transfer to ${recipient}`,
            accountId: selectedAccount.id,
            category: 'Transfer'
        });

        // Show success feedback
        showToast("Transfer Successful", `Sent ${formatCurrency(amount)} to ${recipient}.`, "success");
        
        // Reset form
        elements.transferAmount.value = '';
        elements.transferRecipient.value = '';
        
        // Re-render dashboard
        renderBalances();
        renderTransferAccounts();
        renderTransactions();
    });

    // Intercept sidebar placeholder links to show a toast instead
    document.querySelectorAll('aside nav a, aside div a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') {
                e.preventDefault();
                const linkName = link.querySelector('.font-medium').textContent;
                if (linkName === 'Dashboard') {
                    currentAccountFilter = null;
                    currentTransactionFilter = 'all';
                    renderBalances();
                    renderTransactions();
                    return; // Dashboard just resets filters
                }
                showToast("Coming Soon", `The ${linkName} module is under development.`, "info");
            }
        });
    });

    elements.logoutBtn.addEventListener('click', () => {
        Store.logout();
        window.location.href = 'index.html';
    });

    // Initialize Dashboard UI
    renderHeader();
    renderBalances();
    renderTransferAccounts();
    renderTransactions();
});
