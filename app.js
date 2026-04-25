const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, currentType = "", selectedUsdc = 0;

const operators = {
    mobile: ["Jio Prepaid", "Airtel Prepaid", "Vi Prepaid"],
    electricity: ["Tata Power", "Adani Electricity", "Bescom"],
    dth: ["Tata Play", "Airtel DTH", "Dish TV"],
    broadband: ["JioFiber", "Airtel Xstream"],
    train: ["IRCTC"], bus: ["RedBus"], flight: ["IndiGo"], movie: ["PVR"]
};

const labels = {
    mobile: "Mobile Number", electricity: "Consumer ID",
    dth: "Smart Card ID", broadband: "Subscriber ID",
    train: "PNR No", bus: "Route", flight: "Dest.", movie: "Cinema"
};

const mockPlans = [
    { name: "1.5GB/Day - 28 Days", inr: 299 },
    { name: "2GB/Day - 84 Days", inr: 749 },
    { name: "Unlimited 5G - 365 Days", inr: 2999 }
];

async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet!");
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
    } catch (e) {}
}

function openPopup(type) {
    currentType = type;
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase();
    document.getElementById("targetId").placeholder = labels[type];
    const opSelect = document.getElementById("operatorSelect");
    opSelect.innerHTML = `<option disabled selected>Select Provider</option>`;
    operators[type].forEach(op => opSelect.innerHTML += `<option value="${op}">${op}</option>`);
    document.getElementById("customAmountBox").classList.add("hidden");
    document.getElementById("plansBox").classList.add("hidden");
    document.getElementById("finalPayBtn").classList.add("hidden");
}

function checkTypeAndShow() {
    if (currentType === 'mobile') {
        document.getElementById("customAmountBox").classList.add("hidden");
        document.getElementById("plansBox").classList.remove("hidden");
        loadPlans();
    } else {
        document.getElementById("plansBox").classList.add("hidden");
        document.getElementById("customAmountBox").classList.remove("hidden");
        document.getElementById("finalPayBtn").classList.remove("hidden");
    }
}

function convertToUsdc(val) {
    selectedUsdc = (val / INR_RATE).toFixed(2);
    document.getElementById("convertedUsdc").innerText = selectedUsdc;
}

function loadPlans() {
    const list = document.getElementById("plansList");
    list.innerHTML = "";
    mockPlans.forEach(plan => {
        const usdc = (plan.inr / INR_RATE).toFixed(2);
        list.innerHTML += `<div onclick="selectPlan(${plan.inr}, ${usdc})" class="plan-card mb-2 flex justify-between items-center">
            <span class="text-[11px]">${plan.name}</span><span class="text-blue-400 font-bold">₹${plan.inr} (${usdc} USDC)</span>
        </div>`;
    });
}

function selectPlan(inr, usdc) {
    selectedUsdc = usdc;
    const btn = document.getElementById("finalPayBtn");
    btn.classList.remove("hidden");
    btn.innerText = `CONFIRM ₹${inr}`;
    const cards = document.querySelectorAll('.plan-card');
    cards.forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

async function executeFinalPayment() {
    const id = document.getElementById("targetId").value;
    const op = document.getElementById("operatorSelect").value;
    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        
        // Show Card
        document.getElementById("resId").innerText = id;
        document.getElementById("resOp").innerText = op;
        document.getElementById("resAmt").innerText = selectedUsdc + " USDC";
        closeModal('bookingModal');
        document.getElementById("successModal").classList.remove("hidden");
        
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Fail!"); btn.innerText = "Confirm Payment"; btn.disabled = false; }
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) {}
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
        list.innerHTML = logs.slice(-limit).reverse().map(l => `<div class="flex justify-between border-b border-white/5 pb-2 text-[10px]">
            <p>To: ${l.args.to.slice(0,12)}...</p><p class="font-bold">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p>
        </div>`).join('');
    } catch (e) {}
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function openReceive() { alert("Addr: " + userAddress); }
function openHistoryModal() { document.getElementById("historyModal").classList.remove("hidden"); getHistory(100, "fullHistoryList"); }
