// --- CONFIGURATION ---
const ARC_RPC = "https://rpc.testnet.arc.network/";
const USDC_CONTRACT = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID_HEX = "0x4cef52"; 
const USDC_TO_INR_RATE = 83.50;

let provider, signer, user;

// --- CONNECT WALLET ---
async function connect() {
    if (!window.ethereum) return alert("Please install MetaMask!");

    try {
        // Auto switch/add Arc Network
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID_HEX }],
            });
        } catch (err) {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID_HEX,
                        chainName: "Arc Testnet",
                        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                        rpcUrls: [ARC_RPC],
                        blockExplorerUrls: ["https://testnet.arcscan.app/"]
                    }]
                });
            }
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        user = accounts[0];
        
        // Setup Ethers
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // UI Update
        document.getElementById('addr').innerText = user.slice(0, 4) + "..." + user.slice(-5).toUpperCase();
        document.getElementById('connectBtn').innerText = "Connected";
        
        fetchBalance();
        renderHistory();

    } catch (e) {
        console.error("Connection failed", e);
    }
}

// --- BALANCE FETCH ---
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_CONTRACT, abi, provider);
        const balance = await contract.balanceOf(user);
        const formatted = ethers.utils.formatUnits(balance, 6);
        
        updateBalanceUI(parseFloat(formatted));
    } catch (e) {
        updateBalanceUI(100.00); // Demo fallback
    }
}

function updateBalanceUI(amt) {
    document.getElementById('usdcBal').innerText = amt.toFixed(2);
    document.getElementById('inrBal').innerText = (amt * USDC_TO_INR_RATE).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// --- TRANSFER LOGIC ---
function openTransfer() {
    if (!user) return alert("Connect wallet first!");
    document.getElementById('transferModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('transferModal').classList.add('hidden');
}

function showInrPreview(val) {
    const preview = document.getElementById('inrPreview');
    if (!val) { preview.innerText = "0.00"; return; }
    preview.innerText = (parseFloat(val) * USDC_TO_INR_RATE).toLocaleString('en-IN');
}

async function executeTransfer() {
    const to = document.getElementById('recipientAddr').value;
    const amount = document.getElementById('sendAmount').value;
    const btn = document.getElementById('sendBtn');

    if (!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if (!amount || amount <= 0) return alert("Enter valid amount!");

    try {
        btn.innerText = "Sending...";
        btn.disabled = true;

        const abi = ["function transfer(address,uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_CONTRACT, abi, signer);
        
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amount, 6));
        console.log("Tx Sent:", tx.hash);
        
        await tx.wait();
        alert("Payment Successful!");
        closeModal();
        fetchBalance();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "Confirm Payment";
        btn.disabled = false;
    }
}

// --- MOCK HISTORY ---
function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = `
        <div class="flex justify-between items-center border-b border-white/5 pb-2">
            <span>Payment to Merchant</span>
            <span class="text-red-400 font-bold">-5.00 USDC</span>
        </div>
        <div class="flex justify-between items-center border-b border-white/5 pb-2">
            <span>Received from Circle</span>
            <span class="text-green-400 font-bold">+50.00 USDC</span>
        </div>
    `;
}
