const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50; 

let userAddress = "", provider, signer, currentType = "", selectedItem = null;

const db = {
    flight: [ {op: "Akasa Air", id: "QP-1126", time: "23:00 - 01:55", inr: 7421, dur: "2h 55m"}, {op: "IndiGo", id: "6E-6366", time: "02:00 - 04:45", inr: 7424, dur: "2h 45m"} ],
    train: [ {op: "Rajdhani Exp", id: "12301", time: "16:55 - 10:00", inr: 4500, dur: "17h 05m"}, {op: "Gitanjali", id: "12860", time: "13:40 - 21:20", inr: 840, dur: "31h 40m"} ],
    bus: [ {op: "SANA TRAVELS", id: "WB-41", time: "21:15 - 06:00", inr: 540, dur: "8h 45m"} ],
    hotel: [ {op: "ITC Sonar", id: "Tangra", time: "Check-in 12PM", inr: 9000, dur: "1 Night"} ]
};

async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("walletAddr").innerText = userAddress.slice(0, 10) + "...";
    changePage('dashPage');
    fetchBalance();
}

function openSearch(type) {
    currentType = type;
    document.getElementById("searchType").innerText = `BOOK ${type}`;
    let html = (type === 'hotel') ? 
        `<input type="text" id="src" placeholder="City or Property" class="w-full p-4 rounded-xl text-xs">` : 
        `<input type="text" id="src" placeholder="From (e.g. CCU)" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To (e.g. BOM)" class="w-full p-4 rounded-xl text-xs">`;
    document.getElementById("searchInputs").innerHTML = html;
    changePage('searchPage');
}

function runSearch() {
    const src = document.getElementById("src").value;
    document.getElementById("resRoute").innerText = (currentType==='hotel') ? src : `${src} -> ${document.getElementById("dst").value}`;
    changePage('resultsPage');
    const loader = document.getElementById("loader");
    loader.classList.remove("hidden");
    
    setTimeout(() => {
        loader.classList.add("hidden");
        const inject = document.getElementById("resultsInject");
        inject.innerHTML = db[currentType].map(item => {
            const usdc = (item.inr / INR_RATE).toFixed(2);
            return `<div onclick="openReview('${item.op}', '${item.id}', ${item.inr}, ${usdc}, '${item.time}', '${item.dur}')" class="flight-item shadow-lg italic uppercase">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-black text-xs text-blue-700">${item.op}</span>
                    <span class="font-black text-xs">₹${item.inr}</span>
                </div>
                <div class="flex justify-between text-[10px] opacity-70">
                    <span>${item.time}</span>
                    <span class="text-[8px] font-bold text-green-600">${item.dur} | Non-stop</span>
                    <span>${usdc} USDC</span>
                </div>
            </div>`;
        }).join('');
    }, 1500);
}

function openReview(op, id, inr, usdc, time, dur) {
    selectedItem = { op, id, inr, usdc, time, dur };
    changePage('reviewPage');
    document.getElementById("reviewInject").innerHTML = `
        <div class="glass p-5">
            <h3 class="text-blue-400 font-black italic mb-2">${op} • ${id}</h3>
            <p class="text-xs">${time}</p>
            <p class="text-[10px] opacity-40 italic mt-2">BAGGAGE: 15KG CHECK-IN | 7KG CABIN</p>
        </div>`;
    document.getElementById("totalPriceLabel").innerText = `Total Amount: ₹${inr} (${usdc} USDC)`;
}

async function executePayment() {
    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedItem.usdc.toString(), 6), { gasLimit: 150000, type: 0 });
        btn.innerText = "CONFIRMING...";
        await tx.wait();
        document.getElementById("resDesc").innerText = `${selectedItem.op} - ${selectedItem.id}`;
        document.getElementById("resAmt").innerText = selectedItem.usdc + " USDC";
        changePage('successPage');
    } catch (e) { alert("Payment Fail!"); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
}

async function fetchBalance() {
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBalDisplay").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBalDisplay").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

function changePage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function openReceive() { alert("Your Wallet: " + userAddress); }
