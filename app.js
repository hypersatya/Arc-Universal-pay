// --- CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; 
const ARC_CHAIN = "0x4cef52";
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, html5QrCode, currentUtil = "";

const utilInfo = {
    mobile: "Plan: 1.5GB/Day | Validity: 28 Days",
    electricity: "Units Consumed: 142 kWh (Last Month)",
    dth: "Pack: Family HD | Validity: 30 Days",
    broadband: "Speed: 100 Mbps | Data: Unlimited"
};

// --- CORE FUNCTIONS ---
async function connectWallet() {
    console.log("Connect Wallet Clicked");
    
    if (typeof window.ethereum === 'undefined') {
        alert("Bhai, Wallet install nahi hai! OKX ya MetaMask download karo.");
        return;
    }

    try {
        // Network Switch
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_CHAIN }],
        }).catch(async (err) => {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN,
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
        console.log("User Connected:", userAddress);

        // Ethers Setup
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // UI Switch
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) {
        console.error("Connection Error:", e);
        alert("Connection Fail: " + e.message);
    }
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) {
        console.log("Balance fetch error, showing mock.");
        document.getElementById("usdcBal").innerText = "0.00";
    }
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -10000, "latest");

        if (logs.length === 0) {
            list.innerHTML = `<div class="text-center opacity-20 py-4 text-xs italic">No History Found</div>`;
            return;
        }

        list.innerHTML = logs.slice(-limit).reverse().map(log => {
            const val = ethers.utils.formatUnits(log.args.value, 6);
            return `
            <div class="flex justify-between items-center border-b border-white/5 pb-3 text-xs">
                <div><p class="text-blue-300 font-bold">To: ${log.args.to.slice(0,10)}...</p><p class="opacity-30">Confirmed</p></div>
                <div class="text-right font-black italic uppercase"><p>-${val} USDC</p></div>
            </div>`;
        }).join('');
    } catch (e) { console.log(e); }
}

function setupUtility(type) {
    currentUtil = type;
    document.getElementById("utilityBox").classList.remove("hidden");
    document.getElementById("utilDetail").innerText = utilInfo[type];
}

// Baki ke helpers
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function updateInr(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
