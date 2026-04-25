let user = null;

// Wallet Connection
async function connect() {
    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        user = accounts[0];
        document.getElementById('addr').innerText = user.slice(0,6) + "..." + user.slice(-4);
        document.getElementById('connectBtn').innerText = "Connected";
        alert("Wallet Connected: " + user);
    } else {
        alert("Please install MetaMask!");
    }
}

// Transfer Button Actions
function openTransfer() {
    if(!user) return alert("Please connect wallet first!");
    document.getElementById('payModal').classList.remove('hidden');
}

function closeTransfer() {
    document.getElementById('payModal').classList.add('hidden');
}

function updateINR(val) {
    document.getElementById('inrPreview').innerText = (val * 83.50).toLocaleString('en-IN');
}

// Transaction Logic
async function send() {
    const to = document.getElementById('toAddr').value;
    const amount = document.getElementById('payAmt').value;

    if(!to || !amount) return alert("Fill all details!");
    
    alert(`Initiating transfer of ${amount} USDC to ${to}...`);
    // Real Web3 logic yahan aayegi (ethers contract call)
    closeTransfer();
}

// Other Buttons
function showAddress() {
    if(!user) return alert("Connect wallet first!");
    alert("Your Receive Address: " + user);
}

function startScanner() {
    alert("Camera Scanner feature starting... (Requires HTTPS)");
}
