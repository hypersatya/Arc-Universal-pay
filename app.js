// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // Arc Testnet USDC
const ARC_CHAIN_ID_HEX = "0x4cef52"; 
const INR_RATE = 83.50; 

let userAddress = "";
let provider, signer;

// 1. CONNECTION & DASHBOARD SWITCH
async function connectWallet() {
    if (!window.ethereum) return alert("Bhai, OKX ya MetaMask install karo!");

    try {
        // Auto-switch to Arc Testnet
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_CHAIN_ID_HEX }],
        }).catch(async (err) => {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID_HEX,
                        chainName: "Arc Testnet",
                        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                        rpcUrls: ["https://rpc.testnet.arc.network/"],
                        blockExplorerUrls: ["https://testnet.arcscan.app/"]
                    }]
                });
            }
        });

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Screen Switch
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");

        // UI Update
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
        loadHistory(); // Puraani history load karo
    } catch (e) {
        console.error("Connection Failed", e);
    }
}

// 2. RECEIVE MODAL (QR & COPY)
function openReceive() {
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("fullAddrDisplay").innerText = userAddress;
    
    // QR Code Generate
    document.getElementById("qrcode").innerHTML = ""; // Clear existing
    new QRCode(document.getElementById("qrcode"), {
        text: userAddress,
        width: 180,
        height: 180,
        colorDark: "#030613",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function copyAddr() {
    navigator.clipboard.writeText(userAddress);
    alert("Address Copied! ✅");
}

// 3. TRANSACTION HISTORY (LOCAL STORAGE)
function saveTx(to, amount, hash) {
    let history = JSON.parse(localStorage.getItem("arc_tx_history") || "[]");
    const newTx = {
        to: to,
        amount: amount,
        hash: hash,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    history.unshift(newTx);
    localStorage.setItem("arc_tx_history", JSON.stringify(history.slice(0, 5))); // Keep last 5
    loadHistory();
}

function loadHistory() {
    const list = document.getElementById("txHistoryList");
    let history = JSON.parse(localStorage.getItem("arc_tx_history") || "[]");
    
    if (history.length === 0) {
        list.innerHTML = `<div class="opacity-20 italic text-center py-4 text-xs">No recent transactions</div>`;
        return;
    }

    list.innerHTML = history.map(tx => `
        <div class="flex justify-between items-center border-b border-white/5 pb-3">
            <div>
                <p class="text-blue-300 font-bold text-[11px]">To: ${tx.to.slice(0,6)}...${tx.to.slice(-4)}</p>
                <p class="opacity-30 text-[9px] uppercase font-bold">${tx.time}</p>
            </div>
            <div class="text-right font-black italic">
                <p class="text-white text-sm">-${tx.amount} USDC</p>
                <a href="https://testnet.arcscan.app/tx/${tx.hash}" target="_blank" class="text-blue-500 text-[9px] uppercase">Details</a>
            </div>
        </div>
    `).join('');
}

// 4. EXECUTE PAYMENT (FIXED FOR OKX)
async function executePayment() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("amount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to)) return alert("Address sahi nahi hai!");
    if (!amount || amount <= 0) return alert("Amount sahi daalo!");

    try {
        btn.innerText = "SENDING...";
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const units = ethers.utils.parseUnits(amount, 6);

        // Transaction with OKX Fix
        const tx = await contract.transfer(to, units, {
            gasLimit: 120000,
            gasPrice: await provider.getGasPrice(),
            type: 0 // Legacy mode
        });
        
        await tx.wait();
        saveTx(to, amount, tx.hash); // History mein save karo
        alert("Payment Successful! ✅");
        
        closeModal('transferModal');
        fetchBalance();
    } catch (e) {
        console.error(e);
        alert("Transaction Fail! Faucet se USDC mangwao fees ke liye.");
    } finally {
        btn.innerText = "CONFIRM SEND";
        btn.disabled = false;
    }
}

// HELPERS
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(formatted).toFixed(2);
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN');
    } catch (e) {
        document.getElementById("usdcBal").innerText = "100.00"; // Fallback
    }
}

function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
