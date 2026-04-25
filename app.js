const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50; 

let userAddress = "", provider, signer, selectedPrice = 0, selectedItem = "";

// Auto connect wallet on load
async function autoConnect() {
    if (!window.ethereum) return alert("Please install OKX/MetaMask");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 12) + "...";
        fetchBalance();
    } catch (e) { console.error(e); }
}

const mockData = {
    flight: [ {op: "Akasa Air", id: "QP-1126", inr: 7421, time: "23:00 - 01:55"}, {op: "IndiGo", id: "6E-6366", inr: 7424, time: "02:00 - 04:45"} ],
    train: [ {op: "Rajdhani", id: "12301", inr: 4500, time: "16:55 - 10:00"}, {op: "Gitanjali", id: "12860", inr: 840, time: "13:40 - 21:20"} ],
    bus: [ {op: "SANA TRAVELS", id: "WB-41", inr: 540, time: "21:15 - 06:00"} ],
    hotel: [ {op: "ITC Sonar", id: "Tangra", inr: 9000, time: "Guest Name Req."} ],
    mobile: [ {op: "Jio Prepaid", id: "1.5GB/Day", inr: 299, time: "28 Days"}, {op: "Airtel", id: "2GB/Day", inr: 749, time: "84 Days"} ]
};

function startBooking(type) {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("bookingContent").classList.remove("hidden");
    document.getElementById("serviceTitle").innerText = type.toUpperCase() + " OPTIONS";
    
    const list = mockData[type] || mockData['mobile'];
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = "";
    
    list.forEach(item => {
        const usdc = (item.inr / INR_RATE).toFixed(2);
        inject.innerHTML += `
            <div onclick="selectTrip('${item.op}', ${item.inr}, ${usdc})" class="flight-item !block italic uppercase">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-black text-xs text-blue-700">${item.op} • ${item.id}</span>
                    <span class="font-black text-sm text-black">₹${item.inr}</span>
                </div>
                <div class="flex justify-between text-[10px] font-bold opacity-70">
                    <span>${item.time}</span>
                    <span class="text-blue-600">${usdc} USDC</span>
                </div>
            </div>`;
    });
}

function selectTrip(op, inr, usdc) {
    selectedPrice = usdc;
    selectedItem = op;
    document.getElementById("resultsInject").classList.add("hidden");
    document.getElementById("detailsForm").classList.remove("hidden");
    document.getElementById("bottomPay").style.display = "block";
    document.getElementById("totalPriceLabel").innerText = `BOOKING ${op}: ₹${inr} (${usdc} USDC)`;
}

async function payNow() {
    const name = document.getElementById("pName").value;
    if(!name) return alert("Pehle details bharo!");
    
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6), {
            gasLimit: 150000,
            type: 0 
        });

        btn.innerText = "CONFIRMING...";
        await tx.wait();
        
        document.getElementById("resAmt").innerText = selectedPrice + " USDC";
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) {
        alert("Payment Fail!");
        btn.disabled = false;
        btn.innerText = "Confirm & Pay";
    }
}

async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch(e) {}
}

function closeBooking() { location.reload(); }
function openTransfer() { alert("Scan a QR or enter addr to transfer USDC"); }
function openReceive() { alert("Your Addr: " + userAddress); }
