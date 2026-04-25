const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50; 

let userAddress = "", provider, signer, currentType = "", selectedItem = null;

// Fake Data for Real Look
const db = {
    flight: [
        {op: "Akasa Air", id: "QP-1126", time: "23:00 ➔ 01:55", inr: 7421, dur: "2h 55m", st: "CCU-BOM"},
        {op: "IndiGo", id: "6E-6366", time: "02:00 ➔ 04:45", inr: 7424, dur: "2h 45m", st: "CCU-BOM"}
    ],
    train: [
        {op: "Rajdhani Exp", id: "12301", time: "16:55 ➔ 10:00", inr: 4500, dur: "17h 05m", st: "HWH-CSTM"},
        {op: "Gitanjali", id: "12860", time: "13:40 ➔ 21:20", inr: 840, dur: "31h 40m", st: "HWH-CSTM"}
    ],
    bus: [
        {op: "SANA TRAVELS", id: "WB-41", time: "21:15 ➔ 06:00", inr: 540, dur: "8h 45m", st: "KOL-BBN"}
    ],
    hotel: [
        {op: "ITC Sonar", id: "Luxury Stay", time: "Check-in 12PM", inr: 9000, dur: "1 Night", st: "Kolkata"}
    ]
};

// 1. Connection
async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 10) + "...";
        changePage('dashPage');
        fetchBalance();
    } catch (e) { alert("Fail: " + e.message); }
}

// 2. Navigation
function changePage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0,0);
}

// 3. Search Logic
function openSearch(type) {
    currentType = type;
    document.getElementById("searchTitle").innerText = `BOOK ${type}`;
    let html = (type === 'hotel') ? 
        `<input type="text" id="src" placeholder="City or Property Name">` : 
        `<input type="text" id="src" placeholder="From City (e.g. CCU)"><input type="text" id="dst" placeholder="To City (e.g. BOM)">`;
    document.getElementById("searchInputs").innerHTML = html;
    changePage('searchPage');
}

function runSearch() {
    const src = document.getElementById("src").value;
    if(!src) return alert("Details bhariye!");
    
    document.getElementById("resRouteHeader").innerText = (currentType==='hotel') ? src : `${src} ➔ ${document.getElementById("dst").value}`;
    document.getElementById("resDateHeader").innerText = document.getElementById("travelDate").value || "26 APR 2026";
    
    changePage('resultsPage');
    const loader = document.getElementById("loader");
    loader.classList.remove("hidden");
    
    setTimeout(() => {
        loader.classList.add("hidden");
        const inject = document.getElementById("resultsInject");
        inject.innerHTML = db[currentType].map(item => {
            const usdc = (item.inr / INR_RATE).toFixed(2);
            return `
            <div onclick="openReview('${item.op}', '${item.id}', ${item.inr}, ${usdc}, '${item.time}', '${item.dur}', '${item.st}')" class="flight-item italic uppercase">
                <div class="flex justify-between items-center mb-3">
                    <span class="font-black text-xs text-blue-700">${item.op} • ${item.id}</span>
                    <span class="font-black text-sm text-black">₹${item.inr}</span>
                </div>
                <div class="flex justify-between items-center text-[11px] font-bold">
                    <span>${item.time}</span>
                    <span class="text-[9px] text-green-600 border-b-2 border-green-200 pb-1">${item.dur} | Non-stop</span>
                    <span class="text-blue-600 font-black">${usdc} USDC</span>
                </div>
            </div>`;
        }).join('');
    }, 1500);
}

// 4. Review & Details
function openReview(op, id, inr, usdc, time, dur, st) {
    selectedItem = { op, id, inr, usdc, time, dur, st };
    changePage('reviewPage');
    document.getElementById("reviewInject").innerHTML = `
        <div class="glass p-7 shadow-2xl border-blue-500/20">
            <h3 class="text-blue-400 font-black italic text-xl mb-3">${op} • ${id}</h3>
            <p class="text-sm font-bold opacity-80 uppercase">${st} | ${time}</p>
            <p class="text-[10px] opacity-40 italic mt-3 font-bold">BAGGAGE: 15KG CHECK-IN | 7KG CABIN INCLUDED</p>
        </div>`;
    document.getElementById("totalPriceLabel").innerText = `TOTAL PAYABLE: ₹${inr} (${usdc} USDC)`;
}

// 5. Execution (Real Blockchain)
async function executePayment() {
    const name = document.getElementById("pName").value;
    if(!name) return alert("Passenger Name zaroori hai!");
    
    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        // Real Blockchain Call
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedItem.usdc.toString(), 6), {
            gasLimit: 150000,
            type: 0 
        });
        
        btn.innerText = "CONFIRMING ON-CHAIN...";
        await tx.wait();
        
        // Success Fill
        document.getElementById("resDesc").innerText = `${selectedItem.op} (${selectedItem.id})`;
        document.getElementById("resAmt").innerText = selectedItem.usdc + " USDC";
        changePage('successPage');
    } catch (e) { 
        alert("Payment Fail! Balance check karein."); 
        btn.disabled = false; 
        btn.innerText = "Confirm & Pay"; 
    }
}

// 6. Balance Helper
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch(e) {}
}
