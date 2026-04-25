const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; 
const ARC_CHAIN = "0x4cef52";
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, currentType = "";

const operators = {
    mobile: ["Jio Prepaid", "Airtel Prepaid", "Vi Prepaid", "BSNL"],
    electricity: ["Tata Power", "Adani Electricity", "Bescom", "MSEDCL"],
    dth: ["Tata Play", "Airtel DTH", "Dish TV", "Sun Direct"],
    broadband: ["Airtel Xstream", "JioFiber", "ACT Fibernet", "Hathway"],
    train: ["IRCTC", "Tatkal"], bus: ["RedBus", "Zingbus"],
    flight: ["IndiGo", "SpiceJet"], movie: ["BookMyShow", "PVR"]
};

const labels = {
    mobile: "Enter Mobile Number", electricity: "Enter Consumer ID",
    dth: "Enter Smart Card ID", broadband: "Enter Subscriber ID",
    train: "Enter PNR", bus: "Enter Route", flight: "Enter Dest.", movie: "Enter Cinema"
};

async function connectWallet() {
    const debug = document.getElementById("debug");
    try {
        if (!window.ethereum) {
            alert("Bhai, Browser Wallet ya MetaMask nahi mila!");
            return;
        }

        // Request accounts
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];

        // Setup Ethers
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Switch Screen
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
        getHistory(5, "latestTxList");

    } catch (e) {
        console.error(e);
        debug.innerText = "Error: " + e.message;
        alert("Fail: " + e.message);
    }
}

function openPopup(type) {
    currentType = type;
    const modal = document.getElementById("bookingModal");
    const opSelect = document.getElementById("operatorSelect");
    document.getElementById("modalTitle").innerText = type.toUpperCase() + " PAYMENT";
    document.getElementById("bookId").placeholder = labels[type];
    
    opSelect.innerHTML = `<option disabled selected>Select Provider</option>`;
    operators[type].forEach(op => { opSelect.innerHTML += `<option value="${op}">${op}</option>`; });
    
    modal.classList.remove("hidden");
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { document.getElementById("usdcBal").innerText = "0.00"; }
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -10000, "latest");
        list.innerHTML = logs.slice(-limit).reverse().map(l => `
            <div class="flex justify-between border-b border-white/5 pb-2 text-[10px]">
                <p>To: ${l.args.to.slice(0,10)}...</p>
                <p class="font-bold text-blue-400">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p>
            </div>`).join('');
    } catch (e) { list.innerHTML = `<div class="text-center opacity-20 py-4 text-xs italic">Syncing History...</div>`; }
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function openTransfer() { alert("Transfer Modal Logic here"); } 
function openHistoryModal() { document.getElementById("historyModal").classList.remove("hidden"); getHistory(100, "fullHistoryList"); }
