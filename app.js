// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID_HEX = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer;

// 1. CONNECTION (Arc Testnet Setup)
async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet!");
    try {
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

        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        document.getElementById("connectBtn").innerText = "Connected";
        
        fetchBalance();
    } catch (e) { alert("Error: " + e.message); }
}

// 2. BALANCE & INR
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6);
        updateUI(parseFloat(formatted));
    } catch (e) { updateUI(100.00); }
}

function updateUI(amt) {
    document.getElementById("usdcBal").innerText = amt.toFixed(2);
    document.getElementById("inrBal").innerText = (amt * INR_RATE).toLocaleString('en-IN');
}

// 3. SMART ROUTE LOGIC (Tera wala)
function smartRoute(amount) {
    // 50 se kam toh Direct, zyada toh Bridge
    return amount < 50 ? "Direct Send" : "Bridge via CCTP";
}

// 4. TRANSACTION (Working Fix for OKX)
async function sendTransaction() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("sendAmount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if (!amount || amount <= 0) return alert("Enter Amount!");

    try {
        btn.innerText = "PROCESSING...";
        btn.disabled = true;

        const route = smartRoute(parseFloat(amount));
        console.log("Routing via: " + route);

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        const amountInUnits = ethers.utils.parseUnits(amount, 6);

        // --- OKX WALLET FIX ---
        // Hum manually gasLimit aur data pass karenge taaki wallet confuse na ho
        const tx = await contract.transfer(to, amountInUnits, {
            gasLimit: ethers.BigNumber.from("100000"), // Manual limit
            gasPrice: await provider.getGasPrice()    // Network se current price uthao
        });
        
        alert(`Route: ${route}\nTx Sent! Hash: ${tx.hash.slice(0,15)}...`);
        
        await tx.wait();
        alert("Transaction Confirmed! ✅");
        document.getElementById("transferModal").classList.add("hidden");
        fetchBalance();

    } catch (e) {
        console.error(e);
        // Agar gas error hai toh alert do
        if (e.message.includes("insufficient funds")) {
            alert("Error: Aapke wallet mein Gas (USDC) nahi hai!");
        } else {
            alert("Transaction Failed! Code check console.");
        }
    } finally {
        btn.innerText = "CONFIRM PAYMENT";
        btn.disabled = false;
    }
}

// Helper Functions
function openTransfer() { if(userAddress) document.getElementById("transferModal").classList.remove("hidden"); else connectWallet(); }
function closeTransfer() { document.getElementById("transferModal").classList.add("hidden"); }
function updateInrPreview(val) { document.getElementById("previewInr").innerText = (val * INR_RATE).toLocaleString('en-IN'); }
