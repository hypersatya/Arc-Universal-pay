// CONFIG
const USDC_TO_INR = 83.50; // Current Rate
let user;

async function connect() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            user = accounts[0];
            
            // Format: 0x...36783 (Last 5 letters as requested)
            const displayAddr = user.slice(0, 4) + "..." + user.slice(-5);
            document.getElementById('addr').innerText = displayAddr;
            document.getElementById('connectBtn').innerText = "Connected";
            
            updateBalances(100.00); // Setting 100 USDC as default
            renderMockHistory();

        } catch (e) {
            console.error("User rejected connection");
        }
    } else {
        alert("Please install MetaMask!");
    }
}

function updateBalances(amt) {
    const inrValue = amt * USDC_TO_INR;
    document.getElementById('usdcBal').innerText = amt.toFixed(2);
    document.getElementById('inrBal').innerText = inrValue.toLocaleString('en-IN');
}

function renderMockHistory() {
    const list = document.getElementById('historyList');
    const mocks = [
        { type: 'Received', amt: '+10.00 USDC', color: 'text-green-400' },
        { type: 'Sent', amt: '-5.00 USDC', color: 'text-red-400' }
    ];
    
    list.innerHTML = mocks.map(tx => `
        <div class="flex justify-between items-center border-b border-white/5 pb-2">
            <span class="font-medium">${tx.type}</span>
            <span class="${tx.color} font-bold">${tx.amt}</span>
        </div>
    `).join('');
}
