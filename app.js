// CONFIGURATION
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, currentType = "", selectedUsdc = 0, selectedDesc = "";
let html5QrCode;

const searchForms = {
    flight: `<input type="text" id="src" placeholder="From City" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To City" class="w-full p-4 rounded-xl text-xs">`,
    train: `<input type="text" id="src" placeholder="Source Stn" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="Dest Stn" class="w-full p-4 rounded-xl text-xs">`,
    bus: `<input type="text" id="src" placeholder="From" class="w-full p-4 rounded-xl text-xs mb-2"><input type="text" id="dst" placeholder="To" class="w-full p-4 rounded-xl text-xs">`,
    hotel: `<input type="text" id="src" placeholder="City or Hotel Name" class="w-full p-4 rounded-xl text-xs">`,
    mobile: `<input type="text" id="src" placeholder="Mobile Number" class="w-full p-4 rounded-xl text-xs">`
};

const travelData = {
    flight: [{op: "IndiGo", price: 4500}, {op: "Air India", price: 5800}],
    train: [{op: "Rajdhani Exp", price: 2100}, {op: "Duronto", price: 1850}],
    bus: [{op: "RedBus AC", price: 950}, {op: "Volvo Luxury", price: 1200}],
    hotel: [{op: "Taj Stay", price: 8500}, {op: "Budget Inn", price: 1500}]
};

// --- CORE WALLET ---
async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddrDisplay").innerText = userAddress.slice(0, 8) + "..." + userAddress.slice(-5);
    
    fetchBalance();
    getHistory();
}

// --- TRAVEL LOGIC ---
function openPopup(type) {
    currentType = type;
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase();
    document.getElementById("searchFields").innerHTML = searchForms[type] || "";
    document.getElementById("searchBtn").classList.remove("hidden");
    document.getElementById("resultsList").classList.add("hidden");
    document.getElementById("passengerSection").classList.add("hidden");
}

function searchTravel() {
    const src = document.getElementById("src").value;
    if(!src) return alert("Details bharo!");
    const btn = document.getElementById("searchBtn");
    btn.innerText = "Searching Real Routes...";
    
    setTimeout(() => {
        btn.classList.add("hidden");
        document.getElementById("resultsList").classList.remove("hidden");
        const inject = document.getElementById("injectResults");
        inject.innerHTML = "";
        
        travelData[currentType].forEach(item => {
            const usdc = (item.price / INR_RATE).toFixed(2);
            inject.innerHTML += `
                <div onclick="selectTrip('${item.op}', '${src}', ${item.price}, ${usdc})" class="result-card mb-2 flex justify-between items-center">
                    <div><p class="text-blue-400 font-bold text-xs">${item.op}</p><p class="text-[8px] opacity-40">Available</p></div>
                    <div class="text-right"><p class="text-white font-bold text-xs">₹${item.price}</p><p class="text-[8px] opacity-50">${usdc} USDC</p></div>
                </div>`;
        });
    }, 1200);
}

function selectTrip(op, src, inr, usdc) {
    selectedUsdc = usdc;
    selectedDesc = `${op} - ${src}`;
    document.getElementById("resultsList").classList.add("hidden");
    document.getElementById("passengerSection").classList.remove("hidden");
    document.getElementById("selectedRouteInfo").innerText = `Total: ₹${inr} (${usdc} USDC)`;
}

// --- BLOCKCHAIN TRANSACTION ---
async function executeFinalPayment() {
    const btn = document.getElementById("finalPayBtn");
    try {
        btn.innerText = "Waiting for Wallet..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        // Dynamic Gas + Compatibility Mode
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), { gasLimit: 150000, type: 0 });
        
        btn.innerText = "Confirming on Chain...";
        await tx.wait();
        
        document.getElementById("resId").innerText = selectedDesc;
        document.getElementById("resAmt").innerText = selectedUsdc + " USDC";
        closeModal('bookingModal');
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) { alert("Payment Fail: " + e.message); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
}

// --- TOOLS (TRANSFER / RECEIVE / SCAN) ---
async function transferUSDC() {
    const to = document.getElementById("sendToAddr").value;
    const amt = document.getElementById("sendAmt").value;
    if(!ethers.utils.isAddress(to) || !amt) return alert("Check Details");
    
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt.toString(), 6), { gasLimit: 100000, type: 0 });
        await tx.wait();
        alert("Transfer Success!");
        location.reload();
    } catch(e) { alert("Fail!"); }
}

function openReceiveModal() {
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("fullAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}

function startScanner() {
    document.getElementById("scannerModal").classList.remove("hidden");
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
        let a = text.replace("ethereum:", "").split("@")[0].trim();
        if(ethers.utils.isAddress(a)) {
            stopScanner();
            openModal('transferModal');
            document.getElementById("sendToAddr").value = a;
        }
    }).catch(e => alert("Camera Error"));
}

function stopScanner() { if(html5QrCode) html5QrCode.stop().then(()=>document.getElementById("scannerModal").classList.add("hidden")); }

// --- FETCHING LATEST TX FROM BLOCKCHAIN ---
async function getHistory() {
    const list = document.getElementById("latestTxList");
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
        list.innerHTML = logs.slice(-5).reverse().map(l => `
            <div class="flex justify-between border-b border-white/5 pb-2 text-[9px] uppercase italic font-bold">
                <div><p class="text-blue-300">To: ${l.args.to.slice(0,12)}...</p></div>
                <div class="text-right"><p>-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p></div>
            </div>`).join('');
    } catch (e) { list.innerHTML = "No Tx Found"; }
}

async function fetchBalance() {
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBalDisplay").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBalDisplay").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
