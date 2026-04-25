const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; 
const ARC_CHAIN = "0x4cef52";
const INR_RATE = 83.50; // 1 USDC = 83.50 INR

let userAddress = "";
let provider, signer, currentType = "", selectedUsdc = 0;

const operators = {
    mobile: ["Jio Prepaid", "Airtel Prepaid", "Vi Prepaid", "BSNL"],
    electricity: ["Tata Power", "Adani Electricity", "MSEDCL", "Bescom"],
    dth: ["Tata Play", "Airtel DTH", "Dish TV"],
    broadband: ["Airtel Xstream", "JioFiber", "Hathway"],
    train: ["IRCTC"], bus: ["RedBus"], flight: ["IndiGo"], movie: ["PVR Cinemas"]
};

const labels = {
    mobile: "Enter Mobile Number", electricity: "Enter Consumer ID",
    dth: "Enter Smart Card ID", broadband: "Enter Subscriber ID",
    train: "Enter Route/PNR", bus: "Enter Route", flight: "Enter Destination", movie: "Enter Cinema"
};

const mockPlans = [
    { name: "1.5GB/Day - 28 Days", inr: 299 },
    { name: "2GB/Day - 84 Days", inr: 749 },
    { name: "Unlimited 5G - 365 Days", inr: 2999 },
    { name: "Data Booster 6GB", inr: 61 }
];

async function connectWallet() {
    if (!window.ethereum) return alert("Install OKX Wallet!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4).toUpperCase();
        
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { console.error(e); }
}

function openPopup(type) {
    currentType = type;
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase();
    document.getElementById("targetId").placeholder = labels[type];
    
    const opSelect = document.getElementById("operatorSelect");
    opSelect.innerHTML = `<option disabled selected>Select Provider</option>`;
    operators[type].forEach(op => {
        opSelect.innerHTML += `<option value="${op}">${op}</option>`;
    });

    // Reset Flow
    document.getElementById("plansBox").classList.add("hidden");
    document.getElementById("paySection").classList.add("hidden");
}

function loadPlans() {
    const box = document.getElementById("plansBox");
    const list = document.getElementById("plansList");
    box.classList.remove("hidden");
    list.innerHTML = "";

    mockPlans.forEach(plan => {
        const usdc = (plan.inr / INR_RATE).toFixed(2);
        list.innerHTML += `
            <div onclick="selectPlan('${plan.name}', ${plan.inr}, ${usdc})" class="plan-card p-4 rounded-xl mb-2">
                <div class="flex justify-between items-center text-[11px]">
                    <span>${plan.name}</span>
                    <span class="text-blue-400 font-black">₹${plan.inr}</span>
                </div>
                <p class="text-[8px] opacity-40 mt-1">Cost: ${usdc} USDC</p>
            </div>
        `;
    });
}

function selectPlan(name, inr, usdc) {
    selectedUsdc = usdc;
    document.getElementById("paySection").classList.remove("hidden");
    document.getElementById("selectedPlanLabel").innerText = `${name} (₹${inr})`;
    document.getElementById("finalUsdc").innerText = usdc;
}

async function executeFinalPayment() {
    const id = document.getElementById("targetId").value;
    if(!id || selectedUsdc <= 0) return alert("Details check karo!");

    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "PROCESSING...";
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), {
            gasLimit: 120000,
            type: 0 
        });

        await tx.wait();
        alert(`Payment Success for ${id}! ✅`);
        closeModal('bookingModal');
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) {
        alert("Payment Failed!");
    } finally {
        btn.innerText = "PAY & CONFIRM";
        btn.disabled = false;
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
    } catch (e) { console.log(e); }
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -10000, "latest");
        list.innerHTML = logs.slice(-limit).reverse().map(l => `
            <div class="flex justify-between border-b border-white/5 pb-3 text-[10px]">
                <div class="text-left"><p class="text-blue-300 font-bold">To: ${l.args.to.slice(0,10)}...</p><p class="opacity-30">Confirmed</p></div>
                <div class="text-right font-black italic">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</div>
            </div>`).join('');
    } catch (e) { list.innerHTML = "History Syncing..."; }
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
