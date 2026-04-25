const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, html5QrCode;

// Providers List (Mock Data)
const providers = {
    gas: ["Gas Provider 1", "Gas Provider 2"],
    electricity: ["Elec Board 1", "Elec Board 2"],
    water: ["Water Supply A", "Water Supply B"],
    more: ["Broadband", "DTH"]
};

// 1. Connection logic
async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet!");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
    fetchBalance();
    getHistoryFromChain();
}

// 2. Utility Bill Actions (NEW LOOK LOGIC)
function openUtilityDropdown(type) {
    // Unhide the input section
    document.getElementById("utilityInputs").classList.remove("hidden");
    
    const select = document.getElementById("serviceProviderSelect");
    select.innerHTML = `<option value="" disabled selected>Select ${type.toUpperCase()} Provider</option>`; // Clear & set header
    
    // Fill the dropdown based on button click
    providers[type].forEach(p => {
        select.innerHTML += `<option value="${p}">${p}</option>`;
    });
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(formatted).toFixed(2);
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits: 2});
    } catch (e) { document.getElementById("usdcBal").innerText = "100.00"; }
}

async function getHistoryFromChain() {
    const list = document.getElementById("txHistoryList");
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -1000, "latest");
        list.innerHTML = logs.slice(-5).reverse().map(log => `
            <div class="flex justify-between border-b border-white/5 pb-2">
                <p class="text-blue-300 font-bold text-[11px]">To: ${log.args.to.slice(0,6)}...${log.args.to.slice(-4)}</p>
                <p class="text-white text-sm">-${ethers.utils.formatUnits(log.args.value, 6)} USDC</p>
            </div>`).join('');
    } catch (e) { list.innerHTML = `<div class="opacity-20 text-xs">Waiting for Wallet...</div>`; }
}

// helpers
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
