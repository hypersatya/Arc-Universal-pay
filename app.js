const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT_ADDR = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; // Sab utility payments yahan jayengi
const ARC_ID = "0x4cef52";
const INR = 83.50;

let userAddress = "";
let provider, signer, currentUtil = "";

const utilInfo = {
    mobile: "Plan: 1.5GB/Day | Validity: 28 Days",
    electricity: "Units Consumed: 142 kWh (Last Month)",
    dth: "Pack: Family HD | Validity: 30 Days",
    broadband: "Speed: 100 Mbps | Data: Unlimited"
};

async function connectWallet() {
    if(!window.ethereum) return alert("Install Wallet");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddr").innerText = userAddress.slice(0,6)+"..."+userAddress.slice(-4);
    fetchBalance();
    getHistory();
}

function setupUtility(type) {
    currentUtil = type;
    document.getElementById("utilityBox").classList.remove("hidden");
    document.getElementById("utilDetail").innerText = utilInfo[type];
    document.getElementById("utilNumber").placeholder = type === 'electricity' ? 'Consumer ID' : 'Mobile/Account Number';
}

async function payUtility() {
    const amount = document.getElementById("utilAmount").value;
    const num = document.getElementById("utilNumber").value;
    if(!amount || !num) return alert("Details bharo bhai");
    
    // Transfer logic call
    processPayment(MERCHANT_ADDR, amount, `Bill: ${currentUtil.toUpperCase()}`);
}

async function processPayment(to, amt, note) {
    try {
        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6), { gasLimit: 100000, type: 0 });
        await tx.wait();
        alert(`${note} Successful! ✅`);
        fetchBalance();
        getHistory();
    } catch (e) { alert("Payment Failed"); }
}

async function fetchBalance() {
    const abi = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(USDC_ADDR, abi, provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR).toLocaleString('en-IN');
}

async function getHistory() {
    const list = document.getElementById("txHistoryList");
    const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
    const contract = new ethers.Contract(USDC_ADDR, abi, provider);
    const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -500, "latest");
    list.innerHTML = logs.slice(-5).reverse().map(l => `
        <div class="flex justify-between border-b border-white/5 pb-2">
            <p class="text-[10px] text-blue-300">To: ${l.args.to.slice(0,6)}...</p>
            <p class="font-bold text-xs">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p>
        </div>
    `).join('');
}

function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function updateInr(v) { document.getElementById("previewInr").innerText = (v * INR).toLocaleString('en-IN'); }
