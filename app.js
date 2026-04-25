const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, currentType = "", selectedUsdc = 0;

const operators = {
    mobile: ["Jio Prepaid", "Airtel", "Vi"], electricity: ["Tata Power", "Adani"],
    dth: ["Tata Play", "Airtel DTH"], broadband: ["JioFiber", "Airtel Xstream"],
    train: ["IRCTC Partner"], bus: ["RedBus", "Zingbus"], flight: ["IndiGo", "SpiceJet"], hotel: ["MakeMyTrip", "HourlyStays"]
};

const bookingFields = {
    flight: `
        <div class="flex gap-2 mb-2"><button class="bg-blue-600 border border-blue-600 text-[8px] px-3 py-1 rounded-full">One Way</button><button class="opacity-30 text-[8px] px-3 py-1">Round Trip</button></div>
        <input type="text" id="targetId" placeholder="From (CCU - Kolkata)" class="w-full p-3 rounded-lg text-[10px] mb-2">
        <input type="text" placeholder="To (BOM - Mumbai)" class="w-full p-3 rounded-lg text-[10px] mb-2">
        <input type="date" class="w-full p-3 rounded-lg text-[10px]">
    `,
    train: `
        <input type="text" id="targetId" placeholder="From Station (HWH)" class="w-full p-3 rounded-lg text-[10px] mb-2">
        <input type="text" placeholder="To Station (CSTM)" class="w-full p-3 rounded-lg text-[10px] mb-2">
        <input type="date" class="w-full p-3 rounded-lg text-[10px]">
    `,
    bus: `<input type="text" id="targetId" placeholder="From" class="w-full p-3 rounded-lg text-[10px] mb-2"><input type="text" placeholder="To" class="w-full p-3 rounded-lg text-[10px] mb-2"><input type="date" class="w-full p-3 rounded-lg text-[10px]">`,
    hotel: `<input type="text" id="targetId" placeholder="City / Property" class="w-full p-3 rounded-lg text-[10px] mb-2"><div class="flex gap-2"><input type="date" class="w-1/2 p-3 rounded-lg text-[10px]"><input type="text" placeholder="1 Room" class="w-1/2 p-3 rounded-lg text-[10px]"></div>`
};

const mockPlans = [ { name: "1.5GB/Day - 28 Days", inr: 299 }, { name: "2GB/Day - 84 Days", inr: 749 }, { name: "Unlimited 5G - 1 Year", inr: 2999 } ];

async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4).toUpperCase();
    fetchBalance();
    getHistory(5, "latestTxList");
}

function openPopup(type) {
    currentType = type;
    const modal = document.getElementById("bookingModal");
    const fields = document.getElementById("searchFields");
    const opSelect = document.getElementById("operatorSelect");
    
    document.getElementById("modalTitle").innerText = type.toUpperCase();
    fields.innerHTML = bookingFields[type] || `<input type="text" id="targetId" placeholder="ID / Number" class="w-full p-4 rounded-xl text-xs">`;
    
    opSelect.innerHTML = `<option disabled selected>Select Provider</option>`;
    operators[type].forEach(op => opSelect.innerHTML += `<option value="${op}">${op}</option>`);

    document.getElementById("amountInputBox").classList.add("hidden");
    document.getElementById("plansBox").classList.add("hidden");
    document.getElementById("finalPayBtn").classList.add("hidden");
    modal.classList.remove("hidden");
}

function checkTypeAndShow() {
    if (currentType === 'mobile') {
        document.getElementById("amountInputBox").classList.add("hidden");
        document.getElementById("plansBox").classList.remove("hidden");
        loadPlans();
    } else {
        document.getElementById("plansBox").classList.add("hidden");
        document.getElementById("amountInputBox").classList.remove("hidden");
        document.getElementById("finalPayBtn").classList.remove("hidden");
    }
}

function convertToUsdc(val) {
    selectedUsdc = (val / INR_RATE).toFixed(2);
    document.getElementById("convertedUsdc").innerText = selectedUsdc;
}

function loadPlans() {
    const list = document.getElementById("plansList");
    list.innerHTML = mockPlans.map(p => {
        const u = (p.inr / INR_RATE).toFixed(2);
        return `<div onclick="selectPlan(${p.inr}, ${u})" class="plan-card mb-2 flex justify-between items-center text-[10px]">
            <span>${p.name}</span><span class="text-blue-400 font-bold">₹${p.inr} (${u} USDC)</span>
        </div>`;
    }).join('');
}

function selectPlan(inr, usdc) {
    selectedUsdc = usdc;
    const btn = document.getElementById("finalPayBtn");
    btn.classList.remove("hidden");
    btn.innerText = `PAY ₹${inr}`;
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

async function executeFinalPayment() {
    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        
        // Success Card
        document.getElementById("resId").innerText = document.getElementById("targetId").value;
        document.getElementById("resOp").innerText = document.getElementById("operatorSelect").value;
        document.getElementById("resAmt").innerText = selectedUsdc + " USDC";
        closeModal('bookingModal');
        document.getElementById("successModal").classList.remove("hidden");
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Payment Fail!"); btn.innerText = "Confirm Payment"; btn.disabled = false; }
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
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -2000, "latest");
        list.innerHTML = logs.slice(-limit).reverse().map(l => `<div class="flex justify-between border-b border-white/5 pb-2 text-[9px] uppercase italic font-bold">
            <p>To: ${l.args.to.slice(0,12)}...</p><p>-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p>
        </div>`).join('');
    } catch (e) {}
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
