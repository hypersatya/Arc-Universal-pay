const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, currentType = "", selectedUsdc = 0, selectedDesc = "";

const searchForms = {
    flight: `<input type="text" id="src" placeholder="From (e.g. Kolkata)" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To (e.g. Mumbai)" class="w-full p-4 rounded-xl text-xs">`,
    train: `<input type="text" id="src" placeholder="Source Station" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="Destination Station" class="w-full p-4 rounded-xl text-xs">`,
    bus: `<input type="text" id="src" placeholder="From City" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To City" class="w-full p-4 rounded-xl text-xs">`,
    hotel: `<input type="text" id="src" placeholder="City or Property Name" class="w-full p-4 rounded-xl text-xs">`
};

const travelData = {
    flight: [{op: "IndiGo", price: 4500, time: "10:30 AM"}, {op: "Air India", price: 5800, time: "02:15 PM"}],
    train: [{op: "Rajdhani Exp", price: 2100, time: "08:00 PM"}, {op: "Duronto Exp", price: 1850, time: "11:30 AM"}],
    bus: [{op: "RedBus AC", price: 950, time: "09:00 PM"}, {op: "Volvo Luxury", price: 1200, time: "07:30 AM"}],
    hotel: [{op: "Luxury Stay", price: 3200, time: "Check-in 12PM"}, {op: "Budget Inn", price: 1500, time: "Check-in 11AM"}]
};

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
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase() + " SEARCH";
    document.getElementById("searchFields").innerHTML = searchForms[type];
    
    document.getElementById("searchBtn").classList.remove("hidden");
    document.getElementById("resultsList").classList.add("hidden");
    document.getElementById("paySection").classList.add("hidden");
}

function searchTravel() {
    const src = document.getElementById("src").value;
    const dst = document.getElementById("dst") ? document.getElementById("dst").value : "";
    
    if(!src) return alert("Pehle details bharo!");
    
    const searchBtn = document.getElementById("searchBtn");
    const results = document.getElementById("resultsList");
    const inject = document.getElementById("injectResults");

    searchBtn.innerText = "Searching...";
    
    setTimeout(() => {
        searchBtn.classList.add("hidden");
        results.classList.remove("hidden");
        inject.innerHTML = "";

        travelData[currentType].forEach(item => {
            const usdc = (item.price / INR_RATE).toFixed(2);
            inject.innerHTML += `
                <div onclick="selectTrip('${item.op}', '${src} to ${dst}', ${usdc})" class="result-card mb-2">
                    <div class="flex justify-between items-center text-[11px] mb-1">
                        <span class="text-blue-400 font-black">${item.op}</span>
                        <span class="text-white font-black">₹${item.price}</span>
                    </div>
                    <div class="flex justify-between text-[8px] opacity-40">
                        <span>${item.time}</span>
                        <span>${usdc} USDC</span>
                    </div>
                </div>
            `;
        });
    }, 1500);
}

function selectTrip(op, route, usdc) {
    selectedUsdc = usdc;
    selectedDesc = `${op} | ${route}`;
    document.getElementById("paySection").classList.remove("hidden");
    document.getElementById("selectedRouteInfo").innerText = selectedDesc;
}

async function executeFinalPayment() {
    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        
        document.getElementById("resId").innerText = selectedDesc;
        document.getElementById("resAmt").innerText = selectedUsdc + " USDC";
        closeModal('bookingModal');
        document.getElementById("successModal").classList.remove("hidden");
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Payment Fail!"); btn.innerText = "Pay & Confirm"; btn.disabled = false; }
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
        list.innerHTML = logs.slice(-limit).reverse().map(l => `<div class="flex justify-between border-b border-white/5 pb-2 text-[9px] font-bold uppercase italic"><p>To: ${l.args.to.slice(0,12)}...</p><p>-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p></div>`).join('');
    } catch (e) {}
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
