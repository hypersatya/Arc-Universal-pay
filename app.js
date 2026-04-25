// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // Fake or Matic PoS USDC
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const MATIC_CHAIN = '0x89'; // Matic Mainnet
const INR_RATE = 83.50; 

let userAddress = "", provider, signer, currentPriceUsdc = 0, currentDesc = "";

// --- AUTO INIT & HEADER LOGIC ---
async function autoInit() {
    if(!window.ethereum) {
        document.getElementById("walletLabel").innerText = "Install Wallet";
        return;
    }
    try {
        // Auto connect or prompt connect
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // 1. Check & Switch to Matic Chain
        const { chainId } = await provider.getNetwork();
        if(ethers.utils.hexValue(chainId) !== MATIC_CHAIN) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: MATIC_CHAIN }]
                });
                location.reload(); // reload to init on correct chain
            } catch (e) { alert("Switch to Matic Chain in Wallet"); return; }
        }

        // 2. Header UI Update
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 8) + "...";
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 12) + "..." + userAddress.slice(-5);
        document.getElementById("fullAddrDisplay").innerText = userAddress;

        fetchBalance();
        getTxLogs();
    } catch (e) {
        document.getElementById("walletLabel").innerText = "Connect Fail";
    }
}

function toggleWalletMenu() { document.getElementById("myDropdown").classList.toggle("show"); }

// Close dropdown on click outside
window.onclick = function(event) {
  if (!event.target.matches('.dropdown button, .dropdown button *')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) { openDropdown.classList.remove('show'); }
    }
  }
}

// --- FAKE DATA ---
const travelData = {
    flight: [{op: "Akasa Air", id: "QP-1126", inr: 7421}, {op: "IndiGo", id: "6E-6366", inr: 7424}],
    train: [{op: "Rajdhani Exp", id: "12301", inr: 4500}],
    bus: [{op: "SANA TRAVELS", id: "WB-41", inr: 540}],
    hotel: [{op: "Taj Hotel", id: "Luxury", inr: 8500}],
    mobile: [{op: "Jio Prepaid", id: "1.5GB/Day", inr: 299}],
    electricity: [{op: "Tata Power", id: "Bill", inr: 1200}]
};

// --- BOOKING LOGIC ---
function startBooking(type) {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("travelGrid").parentElement.classList.add("hidden");
    document.getElementById("travelGrid").parentElement.nextElementSibling.classList.add("hidden"); // utility grid
    
    document.getElementById("bookingUI").classList.remove("hidden");
    document.getElementById("serviceTitle").innerText = type.toUpperCase() + " OPTIONS";
    const data = travelData[type] || travelData['mobile'];
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = "";
    
    data.forEach(item => {
        const usdc = (item.inr / INR_RATE).toFixed(2);
        inject.innerHTML += `
            <div onclick="selectItem('${item.op}', ${item.inr}, ${usdc})" class="booking-item font-bold italic uppercase animate-in slide-in-from-bottom">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[#000080] text-xs font-black">${item.op} • ${item.id}</span>
                    <span class="text-black text-sm">₹${item.inr}</span>
                </div>
                <div class="text-[10px] text-[#138808] mt-1">${usdc} USDC Payable</div>
            </div>`;
    });
    window.scrollTo(0, document.getElementById("bookingUI").offsetTop);
}

function selectItem(op, inr, usdc) {
    currentPriceUsdc = usdc;
    currentDesc = op;
    document.getElementById("resultsInject").classList.add("hidden");
    document.getElementById("passengerForm").classList.remove("hidden");
    
    document.getElementById("bottomPay").style.display = "block";
    document.getElementById("totalLabel").innerText = `BOOKING ${op}: ₹${inr} (${usdc} USDC)`;
}

async function finalPay() {
    if(!currentPriceUsdc) return;
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING ON MATIC..."; btn.disabled = true;
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        // Final Chain Call
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(currentPriceUsdc.toString(), 6), { gasLimit: 120000, type: 0 });
        
        btn.innerText = "CONFIRMING...";
        await tx.wait();
        
        // Success Fill
        document.getElementById("resDesc").innerText = currentDesc;
        document.getElementById("resAmt").innerText = currentPriceUsdc + " USDC";
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) { alert("Payment Fail!"); btn.disabled = false; btn.innerText = "Confirm Booking"; }
}

// --- TOOLS ---
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBalDisplay").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch(e) {}
}

async function getTxLogs() {
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
        document.getElementById("txList").innerHTML = logs.slice(-3).reverse().map(l => `
            <div class="flex justify-between border-b border-black/5 pb-1">
                <span>To: ${l.args.to.slice(0,10)}...</span>
                <span class="text-[#138808]">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</span>
            </div>`).join('');
    } catch(e) {}
}

function openReceiveModal() {
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
function openTransfer() { alert("Use Scanner or Paste Addr to send"); }
