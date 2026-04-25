const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50; 

let userAddress = "", provider, signer, selectedUsdc = 0, selectedDesc = "";

async function autoInit() {
    if (!window.ethereum) return alert("Install Wallet!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Header Update
        document.getElementById("statusIndicator").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = "Wallet Connected";
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 8) + "..." + userAddress.slice(-5);
        
        fetchBalance();
        getTxHistory();
    } catch (e) { console.log(e); }
}

const db = {
    flight: [ {op: "Akasa Air", id: "QP-1126", inr: 7421}, {op: "IndiGo", id: "6E-6366", inr: 7424} ],
    train: [ {op: "Rajdhani", id: "12301", inr: 4500}, {op: "Gitanjali", id: "12860", inr: 840} ],
    bus: [ {op: "SANA TRAVELS", id: "WB-41", inr: 540} ],
    mobile: [ {op: "Jio Prepaid", id: "1.5GB/Day", inr: 299} ]
};

function showFlow(type) {
    document.getElementById("bookingUI").classList.remove("hidden");
    document.getElementById("serviceTitle").innerText = type.toUpperCase();
    const list = db[type] || db['mobile'];
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = "";
    
    list.forEach(item => {
        const usdc = (item.inr / INR_RATE).toFixed(2);
        inject.innerHTML += `
            <div onclick="selectItem('${item.op}', ${item.inr}, ${usdc})" class="booking-card font-bold italic uppercase">
                <div class="flex justify-between items-center">
                    <span class="text-blue-700 text-xs">${item.op} • ${item.id}</span>
                    <span class="text-black text-sm">₹${item.inr}</span>
                </div>
                <div class="text-[10px] text-blue-500 mt-1">${usdc} USDC Payable</div>
            </div>`;
    });
}

function selectItem(op, inr, usdc) {
    selectedUsdc = usdc;
    selectedDesc = op;
    document.getElementById("resultsInject").classList.add("hidden");
    document.getElementById("pForm").classList.remove("hidden");
    document.getElementById("bottomPay").style.display = "block";
    document.getElementById("totalPrice").innerText = `Total: ₹${inr} (${usdc} USDC)`;
}

async function finalPay() {
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedUsdc.toString(), 6), { gasLimit: 150000, type: 0 });
        await tx.wait();
        alert("Booking Successful!");
        location.reload();
    } catch (e) { alert("Payment Fail!"); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
}

async function fetchBalance() {
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

async function getTxHistory() {
    const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
    const contract = new ethers.Contract(USDC_ADDR, abi, provider);
    const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
    document.getElementById("txList").innerHTML = logs.slice(-3).reverse().map(l => `
        <div class="flex justify-between text-[10px] border-b border-white/5 pb-2">
            <span class="opacity-50">To: ${l.args.to.slice(0,10)}...</span>
            <span class="text-blue-400">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</span>
        </div>`).join('');
}
