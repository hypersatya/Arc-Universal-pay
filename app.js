const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50; 

let userAddress = "", provider, signer, currentType = "", selectedItem = null;

// Search Form Inputs
const flowInputs = {
    flight: `<div class="flex gap-2 mb-2"><button class="bg-blue-600 px-3 py-1 text-[8px] rounded-full">One Way</button><button class="opacity-30 px-3 py-1 text-[8px]">Round Trip</button></div><input type="text" id="src" placeholder="From (CCU - Kolkata)" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To (BOM - Mumbai)" class="w-full p-4 rounded-xl text-xs">`,
    train: `<input type="text" id="src" placeholder="From (HWH)" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To (CSTM)" class="w-full p-4 rounded-xl text-xs">`,
    bus: `<input type="text" id="src" placeholder="Leaving From" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="Going To" class="w-full p-4 rounded-xl text-xs">`,
    hotel: `<input type="text" id="src" placeholder="City or Property (Kolkata)" class="w-full p-4 rounded-xl text-xs">`,
    mobile: `<input type="number" id="src" placeholder="Mobile Number" class="w-full p-4 rounded-xl text-xs">`,
    electricity: `<input type="text" id="src" placeholder="Consumer ID" class="w-full p-4 rounded-xl text-xs">`
};

// Real-like Results Data
const db = {
    flight: [ {op: "Akasa Air", id: "QP-1126", time: "23:00 - 01:55", inr: 7421, dur: "2h 55m"}, {op: "IndiGo", id: "6E-6366", time: "02:00 - 04:45", inr: 7424, dur: "2h 45m"} ],
    train: [ {op: "Gitanjali Exp", id: "12860", time: "13:40 - 21:20", inr: 840, dur: "31h 40m"}, {op: "Rajdhani", id: "12301", time: "16:55 - 10:00", inr: 4500, dur: "17h 05m"} ],
    bus: [ {op: "SANA TRAVELS", id: "WB-41", time: "21:15 - 06:00", inr: 540, dur: "8h 45m"}, {op: "Volvo Luxury", id: "PB-01", time: "20:00 - 05:00", inr: 1200, dur: "9h 00m"} ],
    hotel: [ {op: "ITC Sonar", id: "Tangra", time: "Check-in 12PM", inr: 9000, dur: "1 Night"}, {op: "Fairfield", id: "New Town", time: "Check-in 11AM", inr: 4450, dur: "1 Night"} ]
};

async function connectWallet() {
    if(!window.ethereum) return alert("Install Wallet!");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddrDisplay").innerText = userAddress.slice(0,10) + "...";
    fetchBalance();
}

function openFlow(type) {
    currentType = type;
    document.getElementById("flowModal").classList.remove("hidden");
    document.getElementById("flowTitle").innerText = type.toUpperCase() + " SEARCH";
    document.getElementById("searchInputs").innerHTML = flowInputs[type] || `<input type="text" id="src" placeholder="Enter ID/Number" class="w-full p-4 rounded-xl text-xs">`;
    
    // Reset steps
    document.getElementById("stepSearch").classList.remove("hidden");
    document.getElementById("stepResults").classList.add("hidden");
    document.getElementById("stepReview").classList.add("hidden");
}

function runSearch() {
    const src = document.getElementById("src").value;
    if(!src) return alert("Pehle details bharo!");
    
    document.getElementById("stepSearch").classList.add("hidden");
    const resultsBox = document.getElementById("stepResults");
    resultsBox.classList.remove("hidden");
    
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = `<p class="text-center py-4 animate-pulse">Searching Real Routes...</p>`;

    setTimeout(() => {
        inject.innerHTML = "";
        const data = db[currentType] || [];
        data.forEach(item => {
            const usdc = (item.inr / INR_RATE).toFixed(2);
            inject.innerHTML += `
                <div onclick="selectItem('${item.op}', '${item.id}', ${item.inr}, ${usdc}, '${item.time}', '${item.dur}')" class="flight-card font-bold italic uppercase mb-2">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-blue-400 text-xs font-black">${item.op}</span>
                        <span class="text-white text-xs">₹${item.inr}</span>
                    </div>
                    <div class="flex justify-between text-[8px] opacity-40 font-mono italic">
                        <span>${item.time}</span>
                        <span>${item.dur} | ${usdc} USDC</span>
                    </div>
                </div>`;
        });
    }, 1200);
}

function selectItem(op, id, inr, usdc, time, dur) {
    selectedItem = { op, id, inr, usdc, time, dur };
    document.getElementById("stepResults").classList.add("hidden");
    document.getElementById("stepReview").classList.remove("hidden");
    
    document.getElementById("reviewDetails").innerHTML = `
        <p class="text-blue-400 font-black">${op} (${id})</p>
        <p>${time} | ${dur}</p>
        <p class="opacity-50">Free Cancellation Available</p>
    `;

    document.getElementById("detailLabel").innerText = currentType === 'hotel' ? "Guest Details:" : "Passenger Details:";
    document.getElementById("finalPayLabel").innerText = `Total: ₹${inr} (${usdc} USDC)`;
}

async function executePayment() {
    const name = document.getElementById("pName").value;
    if(!name) return alert("Details bhariye!");
    
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedItem.usdc.toString(), 6), { gasLimit: 150000, type: 0 });
        await tx.wait();
        
        document.getElementById("resDesc").innerText = `${selectedItem.op} - ${selectedItem.id}`;
        document.getElementById("resAmt").innerText = selectedItem.usdc + " USDC";
        document.getElementById("flowModal").classList.add("hidden");
        document.getElementById("successModal").classList.remove("hidden");
    } catch(e) { alert("Payment Fail!"); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
}

async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBalDisplay").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBalDisplay").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch(e) {}
}

function openReceiveModal() {
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("fullAddrDisplay").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
