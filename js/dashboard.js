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

    // 2. DOM Elements & State
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

    // Advanced Filter State
    let currentTransactionFilter = 'all';
    let currentAccountFilter = null;
    let currentSearchFilter = '';
    let currentCategoryFilter = 'all';

    // Static Recipient Suggestions dataset
    const SUGGESTED_CONTACTS = [
        { name: 'Sarah Jenkins', email: 'sarah.j@example.com', account: '•••• 8821' },
        { name: 'Michael Scott', email: 'michael.s@dundermifflin.com', account: '•••• 1245' },
        { name: 'Jim Halpert', email: 'jim.h@dundermifflin.com', account: '•••• 9940' },
        { name: 'Dwight Schrute', email: 'dwight.s@schrute-farms.co', account: '•••• 7766' },
        { name: 'Pam Beesly', email: 'pam.b@example.com', account: '•••• 4432' },
        { name: 'Tech Corp LLC', email: 'billing@techcorp.com', account: '•••• 0019' },
        { name: 'Apex Electricity', email: 'payments@apexpower.org', account: '•••• 5589' }
    ];

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

    // Custom Glassmorphic Select Dropdown
    const renderCustomSelect = () => {
        const accounts = Store.getAccounts();
        const trigger = document.getElementById('customSelectTrigger');
        const optionsContainer = document.getElementById('customSelectOptions');
        const hiddenInput = document.getElementById('transferAccount');
        const triggerText = document.getElementById('customSelectText');

        if (!trigger || !optionsContainer || !hiddenInput) return;

        // Auto-select first account if value not set
        if ((!hiddenInput.value || !accounts.some(a => a.id === hiddenInput.value)) && accounts.length > 0) {
            hiddenInput.value = accounts[0].id;
        }

        const activeAccount = accounts.find(a => a.id === hiddenInput.value) || accounts[0];
        if (activeAccount) {
            triggerText.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-medium text-xs text-on-surface-variant">${activeAccount.name}</span>
                    <span class="text-xs text-outline font-mono mt-0.5">${activeAccount.number} • <span class="text-primary font-bold">${formatCurrency(activeAccount.balance)}</span></span>
                </div>
            `;
        }

        optionsContainer.innerHTML = accounts.map(acc => `
            <div data-value="${acc.id}" class="custom-option p-3 hover:bg-white/5 cursor-pointer transition-colors flex justify-between items-center">
                <div>
                    <p class="font-semibold text-xs text-on-surface">${acc.name}</p>
                    <p class="text-[10px] text-on-surface-variant font-mono mt-0.5">${acc.number}</p>
                </div>
                <span class="text-xs font-bold text-primary">${formatCurrency(acc.balance)}</span>
            </div>
        `).join('');

        // Option selections
        optionsContainer.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = option.dataset.value;
                hiddenInput.value = val;
                
                const acc = accounts.find(a => a.id === val);
                if (acc) {
                    triggerText.innerHTML = `
                        <div class="flex flex-col">
                            <span class="font-medium text-xs text-on-surface-variant">${acc.name}</span>
                            <span class="text-xs text-outline font-mono mt-0.5">${acc.number} • <span class="text-primary font-bold">${formatCurrency(acc.balance)}</span></span>
                        </div>
                    `;
                }
                optionsContainer.classList.add('hidden');
            });
        });
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

        // Apply Category Filter
        if (currentCategoryFilter !== 'all') {
            transactions = transactions.filter(tx => tx.category === currentCategoryFilter);
        }

        // Apply Live Search Filter
        if (currentSearchFilter) {
            const query = currentSearchFilter.toLowerCase().trim();
            transactions = transactions.filter(tx => 
                tx.desc.toLowerCase().includes(query) || 
                tx.category.toLowerCase().includes(query)
            );
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
                <tr class="transaction-row border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center border border-white/5">
                                <span class="material-symbols-outlined text-outline text-lg">
                                    ${isCredit ? 'arrow_downward' : 'arrow_upward'}
                                </span>
                            </div>
                            <span class="font-medium text-sm">${tx.desc}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-on-surface-variant text-sm">${formatDate(tx.date)}</td>
                    <td class="px-6 py-4 text-on-surface-variant text-sm">${tx.category}</td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 rounded-full text-[10px] font-semibold border ${getStatusStyle(tx.status)}">
                            ${tx.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right font-medium text-sm ${amountClass}">
                        ${amountPrefix}${formatCurrency(tx.amount)}
                    </td>
                </tr>
            `;
        }).join('');
    };

    // 6. Actions / Event Listeners
    
    // Mobile Sidebar Toggling Controls
    const menuBtn = document.getElementById('menuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarPanel = document.getElementById('sidebarPanel');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    const openSidebar = () => {
        if (!sidebarPanel || !sidebarBackdrop) return;
        sidebarPanel.classList.remove('-translate-x-full');
        sidebarBackdrop.classList.remove('hidden');
        setTimeout(() => {
            sidebarBackdrop.classList.remove('opacity-0');
            sidebarBackdrop.classList.add('opacity-100');
            sidebarBackdrop.classList.add('pointer-events-auto');
        }, 10);
    };

    const closeSidebar = () => {
        if (!sidebarPanel || !sidebarBackdrop) return;
        sidebarPanel.classList.add('-translate-x-full');
        sidebarBackdrop.classList.remove('opacity-100');
        sidebarBackdrop.classList.add('opacity-0');
        sidebarBackdrop.classList.remove('pointer-events-auto');
        setTimeout(() => {
            sidebarBackdrop.classList.add('hidden');
        }, 300);
    };

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    // Custom Select Toggle opening
    const customSelectTrigger = document.getElementById('customSelectTrigger');
    const customSelectOptions = document.getElementById('customSelectOptions');
    if (customSelectTrigger && customSelectOptions) {
        customSelectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            customSelectOptions.classList.toggle('hidden');
        });
    }

    // Recipient Autocomplete suggestions
    const recipientInput = elements.transferRecipient;
    const suggestionsContainer = document.getElementById('recipientSuggestions');

    if (recipientInput && suggestionsContainer) {
        const filterSuggestions = (val) => {
            const query = val.toLowerCase().trim();
            if (!query) return SUGGESTED_CONTACTS;
            return SUGGESTED_CONTACTS.filter(c => 
                c.name.toLowerCase().includes(query) || 
                c.email.toLowerCase().includes(query) ||
                c.account.includes(query)
            );
        };

        const renderSuggestions = (contacts) => {
            if (contacts.length === 0) {
                suggestionsContainer.innerHTML = `<div class="p-3 text-xs text-outline text-center">No matching contacts.</div>`;
                return;
            }
            suggestionsContainer.innerHTML = contacts.map(c => `
                <div class="suggestion-item p-3 hover:bg-white/5 cursor-pointer transition-colors flex flex-col" data-name="${c.name}">
                    <span class="font-medium text-xs text-on-surface">${c.name}</span>
                    <span class="text-[10px] text-on-surface-variant font-mono mt-0.5">${c.email} • ${c.account}</span>
                </div>
            `).join('');

            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    recipientInput.value = item.dataset.name;
                    suggestionsContainer.classList.add('hidden');
                });
            });
        };

        recipientInput.addEventListener('focus', () => {
            renderSuggestions(filterSuggestions(recipientInput.value));
            suggestionsContainer.classList.remove('hidden');
        });

        recipientInput.addEventListener('input', () => {
            renderSuggestions(filterSuggestions(recipientInput.value));
            suggestionsContainer.classList.remove('hidden');
        });

        recipientInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Close options / autocomplete dropdowns on general window clicks
    document.addEventListener('click', () => {
        if (customSelectOptions) customSelectOptions.classList.add('hidden');
        if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
    });

    // Advanced Filtering Event Listeners
    const txSearch = document.getElementById('txSearch');
    const txCategoryFilter = document.getElementById('txCategoryFilter');
    const activeFiltersContainer = document.getElementById('activeFiltersContainer');
    const activeFiltersList = document.getElementById('activeFiltersList');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    const updateFilterPills = () => {
        if (!activeFiltersContainer || !activeFiltersList) return;

        let activeCount = 0;
        let pillsHTML = '';

        if (currentSearchFilter) {
            activeCount++;
            pillsHTML += `
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] bg-primary/10 border border-primary/20 text-primary">
                    <span>Search: "${currentSearchFilter}"</span>
                    <button id="removeSearchFilter" class="material-symbols-outlined text-xs hover:text-white transition-colors cursor-pointer select-none">close</button>
                </div>
            `;
        }

        if (currentCategoryFilter !== 'all') {
            activeCount++;
            pillsHTML += `
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] bg-primary/10 border border-primary/20 text-primary">
                    <span>Category: ${currentCategoryFilter}</span>
                    <button id="removeCategoryFilter" class="material-symbols-outlined text-xs hover:text-white transition-colors cursor-pointer select-none">close</button>
                </div>
            `;
        }

        if (activeCount > 0) {
            activeFiltersList.innerHTML = pillsHTML;
            activeFiltersContainer.classList.remove('hidden');

            const rmSearch = document.getElementById('removeSearchFilter');
            if (rmSearch) {
                rmSearch.addEventListener('click', () => {
                    if (txSearch) txSearch.value = '';
                    currentSearchFilter = '';
                    renderTransactions();
                    updateFilterPills();
                });
            }

            const rmCategory = document.getElementById('removeCategoryFilter');
            if (rmCategory) {
                rmCategory.addEventListener('click', () => {
                    if (txCategoryFilter) txCategoryFilter.value = 'all';
                    currentCategoryFilter = 'all';
                    renderTransactions();
                    updateFilterPills();
                });
            }
        } else {
            activeFiltersContainer.classList.add('hidden');
            activeFiltersList.innerHTML = '';
        }
    };

    if (txSearch) {
        txSearch.addEventListener('input', (e) => {
            currentSearchFilter = e.target.value;
            renderTransactions();
            updateFilterPills();
        });
    }

    if (txCategoryFilter) {
        txCategoryFilter.addEventListener('change', (e) => {
            currentCategoryFilter = e.target.value;
            renderTransactions();
            updateFilterPills();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (txSearch) txSearch.value = '';
            if (txCategoryFilter) txCategoryFilter.value = 'all';
            currentSearchFilter = '';
            currentCategoryFilter = 'all';
            
            currentTransactionFilter = 'all';
            if (elements.transactionFilters) {
                elements.transactionFilters.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/30', 'active');
                    btn.classList.add('bg-surface-variant/50', 'text-on-surface-variant', 'border-transparent');
                });
                const allBtn = elements.transactionFilters.querySelector('[data-filter="all"]');
                if (allBtn) {
                    allBtn.classList.add('bg-primary/20', 'text-primary', 'border-primary/30', 'active');
                    allBtn.classList.remove('bg-surface-variant/50', 'text-on-surface-variant', 'border-transparent');
                }
            }

            renderTransactions();
            updateFilterPills();
        });
    }
    
    // Transaction Type Tabs Filters
    if (elements.transactionFilters) {
        elements.transactionFilters.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
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

    // Quick Transfer Form Submit
    elements.transferForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const amount = parseFloat(elements.transferAmount.value);
        const recipient = elements.transferRecipient.value;
        const accountId = elements.transferAccount.value;
        const accounts = Store.getAccounts();
        
        if (!amount || amount <= 0 || !recipient || !accountId) return;

        const selectedAccount = accounts.find(acc => acc.id === accountId);
        if (!selectedAccount) return;

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

        showToast("Transfer Successful", `Sent ${formatCurrency(amount)} to ${recipient}.`, "success");
        
        // Reset form inputs
        elements.transferAmount.value = '';
        elements.transferRecipient.value = '';
        
        // Re-render dashboard elements
        renderBalances();
        renderCustomSelect();
        renderTransactions();
    });

    // Dynamic Client-Side Page Router switchTab
    const switchTab = (tabName) => {
        const tabContentContainer = document.getElementById('tabContentContainer');
        const dashboardView = document.getElementById('dashboardView');
        if (!tabContentContainer || !dashboardView) return;

        closeSidebar();

        const existingCustomView = document.getElementById('customTabView');
        if (existingCustomView) {
            existingCustomView.remove();
        }

        if (tabName === 'Dashboard') {
            dashboardView.classList.remove('hidden');
            currentAccountFilter = null;
            currentTransactionFilter = 'all';
            currentSearchFilter = '';
            currentCategoryFilter = 'all';
            if (txSearch) txSearch.value = '';
            if (txCategoryFilter) txCategoryFilter.value = 'all';
            renderBalances();
            renderTransactions();
            updateFilterPills();
            return;
        }

        dashboardView.classList.add('hidden');

        const customView = document.createElement('div');
        customView.id = 'customTabView';
        customView.className = 'space-y-8 animate-reveal';

        let htmlContent = '';
        if (tabName === 'Accounts') {
            const accounts = Store.getAccounts();
            htmlContent = `
                <div class="glass-panel rounded-2xl p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-bold text-on-surface">Your Accounts</h3>
                        <button id="addAccountBtn" class="flex items-center gap-2 bg-primary text-surface hover:bg-[#00f4fe] px-4 py-2 rounded-xl text-xs font-semibold transition-all">
                            <span class="material-symbols-outlined text-sm">add</span>
                            <span>Add Account</span>
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${accounts.map(acc => `
                            <div class="bg-surface-variant/20 border border-outline/20 rounded-xl p-5 hover:border-primary/40 transition-all flex flex-col justify-between h-44">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-bold text-base text-on-surface">${acc.name}</h4>
                                        <p class="text-xs text-on-surface-variant font-mono mt-1">${acc.number}</p>
                                    </div>
                                    <div class="w-9 h-9 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <span class="material-symbols-outlined text-primary text-lg">account_balance_wallet</span>
                                    </div>
                                </div>
                                <div class="mt-2">
                                    <p class="text-[10px] text-on-surface-variant">Available Balance</p>
                                    <p class="text-2xl font-extrabold text-on-surface mt-1 tracking-tight">${formatCurrency(acc.balance)}</p>
                                </div>
                                <div class="flex gap-3 mt-3 pt-3 border-t border-white/5">
                                    <button data-view-history="${acc.id}" class="text-xs font-semibold text-primary hover:text-[#00f4fe] flex items-center gap-1 transition-colors">
                                        <span class="material-symbols-outlined text-xs">history</span> View History
                                    </button>
                                    <button class="text-xs font-semibold text-primary hover:text-[#00f4fe] flex items-center gap-1 transition-colors ml-auto">
                                        <span class="material-symbols-outlined text-xs">settings</span> Manage
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (tabName === 'Transfers') {
            htmlContent = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="glass-panel rounded-2xl p-6">
                        <h3 class="text-lg font-bold mb-4">Send External Transfer</h3>
                        <form id="externalTransferForm" class="space-y-4">
                            <div>
                                <label class="block text-xs font-medium text-on-surface-variant mb-1">Source Account</label>
                                <select id="extSourceAcc" class="w-full bg-surface-variant/50 border border-outline/30 rounded-lg py-2.5 px-4 text-sm text-on-surface outline-none focus:border-primary">
                                    ${Store.getAccounts().map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance)})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-on-surface-variant mb-1">Routing Number</label>
                                <input type="text" id="extRouting" placeholder="9-digit Routing Number" required class="w-full bg-surface-variant/50 border border-outline/30 rounded-lg py-2.5 px-4 text-sm text-on-surface outline-none focus:border-primary font-medium">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-on-surface-variant mb-1">Recipient Account Number</label>
                                <input type="text" id="extAccountNum" placeholder="Account Number" required class="w-full bg-surface-variant/50 border border-outline/30 rounded-lg py-2.5 px-4 text-sm text-on-surface outline-none focus:border-primary font-medium">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-on-surface-variant mb-1">Amount ($)</label>
                                <input type="number" id="extAmount" step="0.01" min="1" placeholder="0.00" required class="w-full bg-surface-variant/50 border border-outline/30 rounded-lg py-2.5 px-4 text-sm text-on-surface outline-none focus:border-primary font-medium">
                            </div>
                            <button type="submit" class="w-full bg-primary text-surface py-3 rounded-xl font-bold hover:bg-[#00f4fe] transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-lg">send</span> Send Transfer
                            </button>
                        </form>
                    </div>
                    <div class="glass-panel rounded-2xl p-6 flex flex-col justify-between">
                        <div>
                            <h3 class="text-lg font-bold mb-2">Transfer Limits & Schedule</h3>
                            <p class="text-xs text-on-surface-variant">Secure transfer processing via FedNow and ACH networks.</p>
                            
                            <div class="mt-6 space-y-4">
                                <div class="flex justify-between items-center py-2 border-b border-white/5">
                                    <span class="text-xs font-medium text-on-surface-variant">Daily ACH Limit</span>
                                    <span class="text-xs font-bold text-on-surface">$25,000.00</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-white/5">
                                    <span class="text-xs font-medium text-on-surface-variant">Instant FedNow Limit</span>
                                    <span class="text-xs font-bold text-on-surface">$10,000.00</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-white/5">
                                    <span class="text-xs font-medium text-on-surface-variant">Weekly Wire Limit</span>
                                    <span class="text-xs font-bold text-on-surface">$100,000.00</span>
                                </div>
                            </div>
                        </div>
                        <div class="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex gap-3 mt-6">
                            <span class="material-symbols-outlined text-lg shrink-0">shield</span>
                            <p>Transfers are protected with industry-standard 256-bit encryption. Scheduled transfers post at 9:00 AM EST on business days.</p>
                        </div>
                    </div>
                </div>
            `;
        } else if (tabName === 'Analytics') {
            const transactions = Store.getTransactions();
            const debitTransactions = transactions.filter(t => t.type === 'debit');

            // Sum totals by category
            const categories = {};
            debitTransactions.forEach(t => {
                const cat = t.category || 'Other';
                categories[cat] = (categories[cat] || 0) + parseFloat(t.amount);
            });

            const totalExpenses = Object.values(categories).reduce((a, b) => a + b, 0);

            const categoryColors = {
                'Housing': '#adc6ff',
                'Groceries': '#f43f5e',
                'Transport': '#eab308',
                'Transfer': '#c0c1ff',
                'Income': '#10b981',
                'Other': '#8b90a0'
            };
            const getCategoryColor = (cat) => {
                return categoryColors[cat] || `hsl(${Math.abs(cat.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360}, 65%, 65%)`;
            };

            const hasExpenses = totalExpenses > 0;

            htmlContent = `
                <div class="glass-panel rounded-2xl p-6">
                    <h3 class="text-lg font-bold text-on-surface mb-2">Spending Analytics</h3>
                    <p class="text-xs text-on-surface-variant mb-6">Real-time dynamic breakdown of your expenditure categories.</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="flex flex-col justify-center items-center h-64 relative font-medium">
                            ${hasExpenses ? `
                                <div class="relative w-full h-full flex items-center justify-center">
                                    <canvas id="spendingChart" class="w-full max-h-60"></canvas>
                                    <div class="absolute text-center pointer-events-none">
                                        <p class="text-2xl font-extrabold text-on-surface">${formatCurrency(totalExpenses)}</p>
                                        <p class="text-[9px] text-outline tracking-wider uppercase mt-1">Expenses</p>
                                    </div>
                                </div>
                            ` : `
                                <div class="text-center p-6 border border-dashed border-outline/20 rounded-xl max-w-sm">
                                    <span class="material-symbols-outlined text-primary text-4xl mb-2">analytics</span>
                                    <p class="text-sm font-semibold text-on-surface">No expense data found</p>
                                    <p class="text-xs text-on-surface-variant mt-1">Submit transactions to see real-time, interactive breakdowns of your spending.</p>
                                </div>
                            `}
                        </div>
                        <div class="space-y-4 flex flex-col justify-center">
                            ${hasExpenses ? Object.entries(categories).map(([cat, amt]) => {
                                const percent = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : 0;
                                const color = getCategoryColor(cat);
                                return `
                                    <div class="flex items-center gap-3">
                                        <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${color}"></span>
                                        <span class="text-xs font-medium text-on-surface-variant">${cat}</span>
                                        <span class="text-xs font-bold text-on-surface ml-auto font-mono">${formatCurrency(amt)} (${percent}%)</span>
                                    </div>
                                `;
                            }).join('') : `
                                <p class="text-xs text-on-surface-variant italic">Waiting for expenditure history...</p>
                            `}
                            ${hasExpenses ? `
                                <div class="border-t border-white/5 pt-4 mt-2">
                                    <p class="text-xs text-on-surface-variant italic">Smart Insights: Spending graphs are automatically updated when checking or savings accounts are debited.</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            if (hasExpenses) {
                // Initialize Chart.js doughnut chart in next thread cycle
                setTimeout(() => {
                    const ctx = document.getElementById('spendingChart');
                    if (ctx && typeof Chart !== 'undefined') {
                        const dataKeys = Object.keys(categories);
                        const dataValues = Object.values(categories);
                        const dataColors = dataKeys.map(k => getCategoryColor(k));

                        new Chart(ctx, {
                            type: 'doughnut',
                            data: {
                                labels: dataKeys,
                                datasets: [{
                                    data: dataValues,
                                    backgroundColor: dataColors,
                                    borderWidth: 0,
                                    hoverOffset: 12
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '78%',
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                        backgroundColor: 'rgba(16, 20, 26, 0.95)',
                                        titleColor: '#dfe2eb',
                                        bodyColor: '#c1c6d7',
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        borderWidth: 1,
                                        padding: 10,
                                        boxPadding: 6,
                                        callbacks: {
                                            label: function(context) {
                                                const value = context.raw;
                                                const percent = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0;
                                                return ` Spent: ${formatCurrency(value)} (${percent}%)`;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }, 50);
            }
        } else if (tabName === 'Cards') {
            const cards = Store.getCards();
            htmlContent = `
                <div class="glass-panel rounded-2xl p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-bold text-on-surface">Active Cards</h3>
                        <button id="addCardBtn" class="flex items-center gap-2 bg-primary text-surface hover:bg-[#00f4fe] px-4 py-2 rounded-xl text-xs font-semibold transition-all">
                            <span class="material-symbols-outlined text-sm">add</span>
                            <span>Order Card</span>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-6">
                            ${cards.map((c, i) => `
                                <div class="relative w-full max-w-[340px] h-[200px] rounded-2xl overflow-hidden glass-panel border border-white/20 p-6 flex flex-col justify-between shadow-2xl bg-gradient-to-br from-primary/20 via-surface-variant/10 to-black/80 transition-all ${c.locked ? 'opacity-40 grayscale-[50%]' : ''}">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="text-[9px] text-primary font-bold tracking-widest uppercase">LUMINOUS ${c.typeName || 'DEBIT'}</p>
                                            <p class="text-xs text-on-surface-variant mt-1 font-mono">${c.name}</p>
                                        </div>
                                        <span class="material-symbols-outlined text-primary text-2xl">contactless</span>
                                    </div>
                                    
                                    <div class="my-2">
                                        <p class="text-lg font-medium font-mono text-on-surface tracking-wider">${c.number}</p>
                                    </div>
                                    
                                    <div class="flex justify-between items-end">
                                        <div>
                                            <p class="text-[7px] text-outline uppercase font-semibold">Card Holder</p>
                                            <p class="text-xs text-on-surface font-semibold mt-0.5">${c.holder}</p>
                                        </div>
                                        <div>
                                            <p class="text-[7px] text-outline uppercase font-semibold">Expires</p>
                                            <p class="text-xs text-on-surface font-semibold mt-0.5 font-mono">${c.expires}</p>
                                        </div>
                                        <span class="font-black text-lg italic text-on-surface tracking-tighter opacity-80">${c.type}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="bg-surface-variant/10 rounded-xl p-5 border border-outline/20 space-y-6">
                            <h4 class="font-bold text-xs text-on-surface">Card Management</h4>
                            
                            ${cards.map(c => `
                                <div class="py-4 border-b border-white/5 last:border-0">
                                    <p class="font-semibold text-xs text-primary mb-3 font-mono">${c.name} (•••• ${c.number.slice(-4)})</p>
                                    
                                    <div class="flex justify-between items-center py-2">
                                        <div>
                                            <p class="text-sm font-semibold text-on-surface">Lock Card</p>
                                            <p class="text-xs text-on-surface-variant mt-0.5">Temporarily block card transactions</p>
                                        </div>
                                        <div data-card-lock-toggle="${c.id}" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors ${c.locked ? 'bg-red-500/20' : 'bg-white/10'}">
                                            <div class="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${c.locked ? 'right-0.5 bg-red-500' : 'left-0.5 bg-on-surface-variant'}"></div>
                                        </div>
                                    </div>
                                    
                                    <div class="flex justify-between items-center py-2 border-t border-white/5">
                                        <div>
                                            <p class="text-sm font-semibold text-on-surface">International Payments</p>
                                            <p class="text-xs text-on-surface-variant mt-0.5">Allow usage outside your country</p>
                                        </div>
                                        <div data-card-intl-toggle="${c.id}" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors ${c.intlEnabled ? 'bg-primary/20' : 'bg-white/10'}">
                                            <div class="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${c.intlEnabled ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant'}"></div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        } else if (tabName === 'Settings') {
            htmlContent = `
                <div class="glass-panel rounded-2xl p-6">
                    <h3 class="text-lg font-bold text-on-surface mb-6">Profile Settings</h3>
                    
                    <div class="max-w-xl space-y-6">
                        <div class="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div class="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                <span id="settingsInitials" class="text-xl font-bold text-primary font-mono"></span>
                            </div>
                            <div>
                                <h4 class="font-bold text-sm text-on-surface" id="settingsName"></h4>
                                <p class="text-xs text-on-surface-variant mt-1" id="settingsEmail"></p>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Full Name</label>
                                <input type="text" id="settingsNameInput" class="w-full bg-surface-variant/30 border border-outline/20 rounded-lg py-2.5 px-4 text-xs text-on-surface outline-none focus:border-primary font-medium">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Email Address</label>
                                <input type="email" id="settingsEmailInput" class="w-full bg-surface-variant/30 border border-outline/20 rounded-lg py-2.5 px-4 text-xs text-on-surface outline-none focus:border-primary font-medium">
                            </div>
                            <button id="saveSettingsBtn" class="bg-primary text-surface hover:bg-[#00f4fe] px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-primary/10">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        customView.innerHTML = htmlContent;
        tabContentContainer.appendChild(customView);

        // Bind interactive triggers per view template
        if (tabName === 'Accounts') {
            const addAccountBtn = document.getElementById('addAccountBtn');
            if (addAccountBtn) {
                addAccountBtn.addEventListener('click', () => {
                    document.getElementById('addAccountModal').classList.remove('hidden');
                });
            }

            customView.querySelectorAll('[data-view-history]').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentAccountFilter = btn.dataset.viewHistory;
                    switchTab('Dashboard');
                    
                    // Highlight the dashboard link
                    const dashLink = document.querySelector('aside nav a');
                    if (dashLink) {
                        document.querySelectorAll('aside nav a, aside div a').forEach(l => {
                            l.className = "flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors";
                        });
                        dashLink.className = "flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary border border-primary/20";
                    }
                });
            });
        } else if (tabName === 'Transfers') {
            const extForm = document.getElementById('externalTransferForm');
            if (extForm) {
                extForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const sourceAccId = document.getElementById('extSourceAcc').value;
                    const routing = document.getElementById('extRouting').value.trim();
                    const recipient = document.getElementById('extAccountNum').value.trim();
                    const amount = parseFloat(document.getElementById('extAmount').value);

                    // Strict Input Validations
                    if (!/^\d{9}$/.test(routing)) {
                        showToast("Validation Error", "Routing Number must be exactly 9 numeric digits.", "error");
                        return;
                    }
                    if (!/^\d{8,17}$/.test(recipient)) {
                        showToast("Validation Error", "Account Number must be between 8 and 17 numeric digits.", "error");
                        return;
                    }
                    if (isNaN(amount) || amount <= 0) {
                        showToast("Validation Error", "Please enter a valid amount greater than $0.", "error");
                        return;
                    }

                    const accounts = Store.getAccounts();
                    const sourceAcc = accounts.find(a => a.id === sourceAccId);
                    if (!sourceAcc) {
                        showToast("Transfer Failed", "Invalid source account.", "error");
                        return;
                    }

                    if (sourceAcc.balance < amount) {
                        showToast("Transfer Failed", "Insufficient funds in the selected account.", "error");
                        return;
                    }

                    // Execute live deduction in Store
                    Store.addTransaction({
                        type: 'debit',
                        amount: amount,
                        desc: `ACH Wire - Recip. ••••${recipient.slice(-4)}`,
                        accountId: sourceAccId,
                        category: 'Transfer'
                    });

                    showToast("Transfer Scheduled", `External ACH wire of ${formatCurrency(amount)} has been successfully executed!`, "success");
                    
                    // Switch view back to main dashboard
                    switchTab('Dashboard');
                    const sidebarDashLink = document.querySelector('aside nav a');
                    if (sidebarDashLink) {
                        document.querySelectorAll('aside nav a, aside div a').forEach(l => {
                            l.className = "flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors";
                        });
                        sidebarDashLink.className = "flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary border border-primary/20";
                    }
                });
            }
        } else if (tabName === 'Cards') {
            const addCardBtn = document.getElementById('addCardBtn');
            if (addCardBtn) {
                addCardBtn.addEventListener('click', () => {
                    document.getElementById('addCardModal').classList.remove('hidden');
                });
            }

            customView.querySelectorAll('[data-card-lock-toggle]').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const cardId = toggle.dataset.cardLockToggle;
                    const card = Store.getCards().find(c => c.id === cardId);
                    if (card) {
                        const newLockState = !card.locked;
                        Store.updateCard(cardId, { locked: newLockState });
                        showToast(newLockState ? "Card Locked" : "Card Unlocked", newLockState ? "No new transactions will be allowed." : "Standard purchases can now be made.", "info");
                        switchTab('Cards');
                    }
                });
            });

            customView.querySelectorAll('[data-card-intl-toggle]').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const cardId = toggle.dataset.cardIntlToggle;
                    const card = Store.getCards().find(c => c.id === cardId);
                    if (card) {
                        const newIntlState = !card.intlEnabled;
                        Store.updateCard(cardId, { intlEnabled: newIntlState });
                        showToast(newIntlState ? "International Enabled" : "International Disabled", newIntlState ? "You can now make purchases worldwide." : "Card blocked outside domestic region.", "info");
                        switchTab('Cards');
                    }
                });
            });
        } else if (tabName === 'Settings') {
            const user = Store.getUser();
            document.getElementById('settingsInitials').textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById('settingsName').textContent = user.name;
            document.getElementById('settingsEmail').textContent = user.email || 'user@luminousledger.com';
            document.getElementById('settingsNameInput').value = user.name;
            document.getElementById('settingsEmailInput').value = user.email || 'user@luminousledger.com';
            
            document.getElementById('saveSettingsBtn').addEventListener('click', () => {
                const newName = document.getElementById('settingsNameInput').value.trim();
                const newEmail = document.getElementById('settingsEmailInput').value.trim();
                
                // Form Validations
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!newName) {
                    showToast("Validation Error", "Full Name cannot be empty.", "error");
                    return;
                }
                if (newEmail && !emailRegex.test(newEmail)) {
                    showToast("Validation Error", "Please enter a valid email address.", "error");
                    return;
                }

                const u = Store.getUser();
                u.name = newName;
                u.email = newEmail;
                Store.updateUser(u);
                showToast("Profile Updated", "Your profile modifications have been cleanly persisted.", "success");
                renderHeader();
                switchTab('Settings');
            });
        }
    };

    // Client-side Nav Tab Event Routing
    document.querySelectorAll('aside nav a, aside div a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            const fontMed = link.querySelector('.font-medium');
            if (href === '#' && fontMed) {
                e.preventDefault();
                const linkName = fontMed.textContent;
                
                // Clear active styles
                document.querySelectorAll('aside nav a, aside div a').forEach(l => {
                    if (l.querySelector('.font-medium')?.textContent === 'Settings') {
                        l.className = "flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors";
                        return;
                    }
                    l.className = "flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors";
                });
                
                // Set active style for selected link (non-settings/logout)
                if (linkName !== 'Log out' && linkName !== 'Settings') {
                    link.className = "flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary border border-primary/20";
                } else if (linkName === 'Settings') {
                    link.className = "flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary border border-primary/20";
                }
                
                if (linkName === 'Log out') {
                    elements.logoutBtn.click();
                    return;
                }

                switchTab(linkName);
            }
        });
    });

    elements.logoutBtn.addEventListener('click', () => {
        Store.logout();
        window.location.href = 'index.html';
    });

    // Modal Management (Close handlers)
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('addAccountModal').classList.add('hidden');
            document.getElementById('addCardModal').classList.add('hidden');
        });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            document.getElementById('addAccountModal').classList.add('hidden');
            document.getElementById('addCardModal').classList.add('hidden');
        });
    });

    // Add Account Form Submission
    const addAccountForm = document.getElementById('addAccountForm');
    if (addAccountForm) {
        addAccountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('newAccName').value.trim();
            const type = document.getElementById('newAccType').value;
            const balance = parseFloat(document.getElementById('newAccBalance').value);

            // Validation checks
            if (!name) {
                showToast("Validation Error", "Account name is required.", "error");
                return;
            }
            if (isNaN(balance) || balance < 0) {
                showToast("Validation Error", "Initial balance must be a non-negative number.", "error");
                return;
            }

            // Centralized Store invocation
            const newAcc = Store.addAccount({
                name: name,
                type: type,
                balance: balance
            });

            showToast("Account Created", `${newAcc.name} has been successfully registered!`, "success");
            
            // Close and reset form
            document.getElementById('addAccountModal').classList.add('hidden');
            addAccountForm.reset();

            // Dynamic refresh of views and tab content
            renderBalances();
            renderCustomSelect();
            renderTransactions();

            // If we are currently on the Accounts tab, re-render it
            const customTabView = document.getElementById('customTabView');
            if (customTabView) {
                switchTab('Accounts');
            }
        });
    }

    // Add Card Form Submission
    const addCardForm = document.getElementById('addCardForm');
    if (addCardForm) {
        addCardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nickname = document.getElementById('newCardName').value.trim();
            const type = document.getElementById('newCardType').value;
            const network = document.getElementById('newCardNetwork').value;

            if (!nickname) {
                showToast("Validation Error", "Card nickname is required.", "error");
                return;
            }

            // Centralized Store invocation
            const newCard = Store.addCard({
                name: nickname,
                type: network, // e.g. VISA or MASTERCARD
                typeName: type // e.g. Debit or Credit
            });

            showToast("Card Issued", `Virtual ${newCard.type} card "${newCard.name}" is now active!`, "success");

            // Close and reset form
            document.getElementById('addCardModal').classList.add('hidden');
            addCardForm.reset();

            // Refresh cards view immediately if active
            const customTabView = document.getElementById('customTabView');
            if (customTabView) {
                switchTab('Cards');
            }
        });
    }

    // Initialize Dashboard UI
    renderHeader();
    renderBalances();
    renderCustomSelect();
    renderTransactions();
});
