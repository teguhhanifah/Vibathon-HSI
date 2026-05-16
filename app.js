/**
 * FreezeFlow - Application Logic
 * Handles pricing, local storage, and UI updates
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    const PRICING = {
        wash: 75000,
        deep: 150000,
        freon: 200000
    };

    // PK Multipliers (Optional complexity for realism)
    const PK_MULTIPLIERS = {
        '0.5': 1.0,
        '1': 1.2,
        '1.5': 1.3,
        '2': 1.5
    };

    // Simulator Wattage Constants
    const AC_WATTS = {
        '0.5': 350,
        '1': 750,
        '1.5': 1150,
        '2': 1500
    };

    let orders = JSON.parse(localStorage.getItem('freezeFlow_orders')) || [];

    // --- DOM Elements ---
    const orderForm = document.getElementById('orderForm');
    const acCountInput = document.getElementById('acCount');
    const pkTypeSelect = document.getElementById('pkType');
    const serviceTypeSelect = document.getElementById('serviceType');
    const totalPriceDisplay = document.getElementById('totalPrice');
    const historyList = document.getElementById('historyList');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // --- Simulator Elements ---
    const simPk = document.getElementById('simPk');
    const simTariff = document.getElementById('simTariff');
    const simHours = document.getElementById('simHours');
    const simSavings = document.getElementById('simSavings');
    const savingsValueDisplay = document.getElementById('savingsValue');

    const dailyBefore = document.getElementById('dailyBefore');
    const dailyAfter = document.getElementById('dailyAfter');
    const dailySavings = document.getElementById('dailySavings');
    const monthlyBefore = document.getElementById('monthlyBefore');
    const monthlyAfter = document.getElementById('monthlyAfter');
    const monthlySavings = document.getElementById('monthlySavings');
    const yearlyBefore = document.getElementById('yearlyBefore');
    const yearlyAfter = document.getElementById('yearlyAfter');
    const yearlySavings = document.getElementById('yearlySavings');

    let costChart = null;
    let savingsChart = null;

    // --- Core Functions ---

    /**
     * Formats number to Indonesian Rupiah currency string
     * @param {number} amount 
     */
    const formatIDR = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    /**
     * Calculates the total price based on form inputs
     */
    const calculateTotal = () => {
        const count = parseInt(acCountInput.value) || 0;
        const pk = pkTypeSelect.value;
        const type = serviceTypeSelect.value;

        const basePrice = PRICING[type] || 0;
        const multiplier = PK_MULTIPLIERS[pk] || 1;

        const total = (basePrice * multiplier) * count;

        totalPriceDisplay.textContent = formatIDR(total);
        return total;
    };

    /**
     * Displays a temporary toast notification
     * @param {string} message 
     */
    const showToast = (message) => {
        toastMessage.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    };

    /**
     * Renders the order history from localStorage
     */
    const renderHistory = () => {
        if (orders.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="package-open"></i>
                    <p>No bookings yet.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Sort orders by date (newest first)
        const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));

        historyList.innerHTML = sortedOrders.map(order => `
            <div class="service-item">
                <div class="item-info">
                    <h4>${order.serviceName} (${order.pk} PK)</h4>
                    <p>${order.count} Unit • ${new Date(order.date).toLocaleDateString('en-GB')}</p>
                </div>
                <div style="text-align: right">
                    <div style="font-weight: 700; color: var(--primary);">${formatIDR(order.total)}</div>
                    <span class="badge badge-upcoming">Upcoming</span>
                </div>
            </div>
        `).join('');

        // Re-initialize icons for newly added elements
        lucide.createIcons();
    };

    // --- Simulator Functions ---

    /**
     * Updates the simulator table and charts
     */
    const updateSimulator = () => {
        const pk = simPk.value;
        const tariff = parseFloat(simTariff.value) || 0;
        const hours = parseFloat(simHours.value) || 0;
        const savingsPct = parseFloat(simSavings.value) || 0;

        // Update savings label
        savingsValueDisplay.textContent = `${savingsPct}%`;

        // Calculate Consumption (kWh)
        const watts = AC_WATTS[pk] || 0;
        const dailyKwh = (watts / 1000) * hours;
        
        // Calculations
        const dBefore = dailyKwh * tariff;
        const dAfter = dBefore * (1 - (savingsPct / 100));
        const dSavings = dBefore - dAfter;

        const mBefore = dBefore * 30;
        const mAfter = dAfter * 30;
        const mSavings = dSavings * 30;

        const yBefore = dBefore * 365;
        const yAfter = dAfter * 365;
        const ySavings = dSavings * 365;

        // Update Table
        dailyBefore.textContent = formatIDR(dBefore);
        dailyAfter.textContent = formatIDR(dAfter);
        dailySavings.textContent = formatIDR(dSavings);

        monthlyBefore.textContent = formatIDR(mBefore);
        monthlyAfter.textContent = formatIDR(mAfter);
        monthlySavings.textContent = formatIDR(mSavings);

        yearlyBefore.textContent = formatIDR(yBefore);
        yearlyAfter.textContent = formatIDR(yAfter);
        yearlySavings.textContent = formatIDR(ySavings);

        updateCharts(mBefore, mAfter, ySavings);
    };

    /**
     * Initializes or updates the charts
     */
    const updateCharts = (mBefore, mAfter, ySavings) => {
        const ctxCost = document.getElementById('costComparisonChart').getContext('2d');
        const ctxSavings = document.getElementById('annualSavingsChart').getContext('2d');

        // Cost Comparison Chart
        if (costChart) {
            costChart.data.datasets[0].data = [mBefore, mAfter];
            costChart.update();
        } else {
            costChart = new Chart(ctxCost, {
                type: 'bar',
                data: {
                    labels: ['Before', 'After'],
                    datasets: [{
                        label: 'Monthly Cost (Rp)',
                        data: [mBefore, mAfter],
                        backgroundColor: ['#64748b', '#0ea5e9'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Monthly Cost Comparison' }
                    }
                }
            });
        }

        // Annual Savings Chart
        if (savingsChart) {
            savingsChart.data.datasets[0].data = [ySavings];
            savingsChart.update();
        } else {
            savingsChart = new Chart(ctxSavings, {
                type: 'bar',
                data: {
                    labels: ['Annual Savings'],
                    datasets: [{
                        label: 'Total Saved (Rp)',
                        data: [ySavings],
                        backgroundColor: ['#10b981'],
                        borderRadius: 8
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Total Annual Savings' }
                    }
                }
            });
        }
    };

    /**
     * Saves a new order and redirects to WhatsApp
     */
    const handleOrderSubmit = (e) => {
        e.preventDefault();

        const count = parseInt(acCountInput.value);
        const pkValue = pkTypeSelect.options[pkTypeSelect.selectedIndex].text.split(' ')[0];
        const serviceName = serviceTypeSelect.options[serviceTypeSelect.selectedIndex].text.split('(')[0].trim();
        const total = calculateTotal();

        const newOrder = {
            id: Date.now(),
            count: count,
            pk: pkValue,
            serviceName: serviceName,
            serviceType: serviceTypeSelect.value,
            total: total,
            date: new Date().toISOString()
        };

        // Save to state and storage
        orders.push(newOrder);
        localStorage.setItem('freezeFlow_orders', JSON.stringify(orders));

        // Construct WhatsApp Message
        const waNumber = "6281944104536"; // Replace with actual admin number
        const waMessage = `Halo FreezeFlow! 👋
Saya ingin memesan layanan cuci AC.

*Detail Pesanan:*
❄️ *Layanan:* ${serviceName}
🌬️ *Kapasitas:* ${pkValue} PK
🔢 *Jumlah:* ${count} Unit
💰 *Total Biaya:* ${formatIDR(total)}

Mohon segera dikonfirmasi. Terima kasih!`;

        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

        // UI Feedback
        showToast('Redirecting to WhatsApp...');

        // Delay slightly for toast visibility
        setTimeout(() => {
            window.open(waUrl, '_blank');
            orderForm.reset();
            calculateTotal();
            renderHistory();
        }, 1500);
    };

    // --- Event Listeners ---

    // Real-time calculation on any input change
    [acCountInput, pkTypeSelect, serviceTypeSelect].forEach(el => {
        el.addEventListener('input', calculateTotal);
    });

    orderForm.addEventListener('submit', handleOrderSubmit);

    // Simulator Listeners
    [simPk, simTariff, simHours, simSavings].forEach(el => {
        el.addEventListener('input', updateSimulator);
    });

    // --- Initialization ---
    calculateTotal();
    renderHistory();
    updateSimulator();
});
