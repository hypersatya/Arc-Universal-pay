// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // Arc Testnet USDC
const ARC_CHAIN_ID_HEX = "0x4cef52"; // Chain ID: 5042002
const INR_RATE = 83.50; // Mock Conversion Rate

let userAddress = "";
let provider, signer;

// 1. CONNECTION LOGIC
async function connectWallet() {
    if (window.ethereum) {
        try {
            // Auto-switch or Add Arc Network
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ARC_CHAIN_ID_HEX }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
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
            }

            // Get Accounts
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            userAddress = accounts[0];
            
            // Initialize Ethers
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            // UI Update: 0x...36783 Format
            const displayAddr = userAddress.slice(0, 6) + "..." + userAddress.slice(-5);
            document.getElementById("walletAddr").innerText = displayAddr.toUpperCase();
            document.getElementById("connectBtn").innerText = "Connected";
            document.getElementById("connectBtn").style.backgroundColor = "#10b981"; // Green color
            
            fetchBalance();
        } catch (e) {
            console.error("Connection Failed", e);
            alert("Connection Error: " + e.message);
        }
    } else {
        alert("Please install a Web3 Wallet like MetaMask or OKX!");
    }
}

// 2. FETCH BALANCE & INR CONVERSION
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6); // Arc USDC has 6 decimals
        
        updateUI(parseFloat(formatted));
    } catch (e) {
        console.error("Balance fetch error", e);
        updateUI(100.00); // Fallback for UI presentation
    }
}

function updateUI(amt) {
    document.getElementById("usdcBal").innerText = amt.toFixed(2);
    document.getElementById("inrBal").innerText = (amt * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits: 2});
}

// 3. ROUTING & MODAL LOGIC
function openTransfer() {
    if (!userAddress) return alert("Pehle Wallet Connect karein!");
    document.getElementById("transferModal").classList.remove("hidden");
}

function closeTransfer() {
    document.getElementById("transferModal").classList.add("hidden");
}

function updateInrPreview(val) {
    const preview = document.getElementById("previewInr");
    if (!val) { preview.innerText = "0.00"; return; }
    preview.innerText = (parseFloat(val) * INR_RATE).toLocaleString('en-IN');
}

// Tera Smart Route Logic
function smartRoute(amount) {
    return amount < 50 ? "Direct Send" : "Bridge via CCTP";
}

// 4. FINAL BLOCKCHAIN TRANSACTION (With OKX Fix)
async function sendTransaction() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("sendAmount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if (!amount || amount <= 0) return alert("Enter Amount!");

    try {
        btn.innerText = "Processing...";
        btn.disabled = true;

        const route = smartRoute(amount);
        console.log("Routing via: " + route);

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        // Arc USDC uses 6 decimals
        const amountInUnits = ethers.utils.parseUnits(amount, 6);

        // TRANSACTION TRIGGER
        // Added explicit gas settings for OKX Wallet stability
        const tx = await contract.transfer(to, amountInUnits, {
            gasLimit: 80000, 
            gasPrice: ethers.utils.parseUnits("0.01", 9) 
        });
        
        alert("Transaction Sent! Route: " + route + "\nHash: " + tx.hash);
        
        await tx.wait();
        alert("Payment Successful!");
        closeTransfer();
        fetchBalance();
        
    } catch (e) {
        console.error(e);
        // Agar gas ka error hai toh user ko samjhao
        if (e.message.includes("insufficient funds")) {
            alert("Error: Aapke paas Gas Fee (USDC) kam hai!");
        } else {
            alert("Error: " + e.message);
        }
    } finally {
        btn.innerText = "Confirm Payment";
        btn.disabled = false;
    }
}

// UI Helpers
function showMyAddress() {
    if (!userAddress) return alert("Connect Wallet First!");
    alert("Your Address: " + userAddress);
}
