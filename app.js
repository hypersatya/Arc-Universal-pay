const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; 
const ARC_ID = "0x4cef52";
const INR = 83.50;

let userAddress = "";
let provider, signer, html5QrCode, currentUtil = "";

const utilInfo = {
    mobile: "Plan: 1.5GB/Day | Validity: 28 Days",
    electricity: "Units Consumed: 142 kWh (Last Month)",
    dth: "Pack: Family HD | Validity: 30 Days",
    broadband: "Speed: 100 Mbps | Data: Unlimited"
};

async function connectWallet() {
    if(!window.ethereum) return alert("Install Wallet!");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
    
    fetchBalance();
    getHistory(5, "latestTxList"); // Real-time fetch for dashboard
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -10000, "latest");

        if (logs.length === 0) {
            list.innerHTML = `<div class="text-center opacity-20 py-4 text-xs italic">No History Found</div>`;
            return;
        }

        list.innerHTML = logs.slice(-limit).reverse().map(log => {
            const val = ethers.utils.formatUnits(log.args.value, 6);
            return `
            <div class="flex justify-between items-center border-b border-white/5 pb-3">
                <div class="text-left">
                    <p class="text-blue-300 font-bold text-[10px]">To: ${log.args.to.slice(0,10)}...</p>
                    <p class="opacity-30 text-[8px] uppercase font-bold italic">Success ✅</p>
                </div>
                <div class="text-right font-black italic uppercase">
                    <p class="text-white text-xs">-${val} USDC</p>
                    <a href="https://testnet.arcscan.app/tx/${log.transactionHash}" target="_blank" class="text-blue-500 text-[8px]">Details</a>
                </div>
            </div>`;
        }).join('');
    } catch (e) { list.innerHTML = `<div class="text-center opacity-20 py-4 italic">Blockchain Syncing...</div>`; }
}

function openHistoryModal() {
    document.getElementById("historyModal").classList.remove("hidden");
    getHistory(100, "fullHistoryList");
}

function setupUtility(type) {
    currentUtil = type;
    document.getElementById("utilityBox").classList.remove("hidden");
    document.getElementById("utilDetail").innerText = utilInfo[type];
}

async function payUtility() {
    const amt = document.getElementById("utilAmount").value;
    const num = document.getElementById("utilNumber").value;
    if(!amt || !num) return alert("Fill details!");
    try {
        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(amt, 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        alert(`${currentUtil.toUpperCase()} Bill Success ✅`);
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Fail!"); }
}

async function fetchBalance() {
    const abi = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(USDC_ADDR, abi, provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR).toLocaleString('en-IN');
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function updateInr(v) { document.getElementById("previewInr").innerText = (v * INR).toLocaleString('en-IN'); }
function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function openReceive() { 
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("fullAddrDisplay").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied! ✅"); }
function startScanner() {
    document.getElementById("scannerModal").classList.remove("hidden");
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (t) => {
        let a = t.replace("ethereum:", "").split("@")[0].trim();
        if(ethers.utils.isAddress(a)) {
            stopScanner();
            document.getElementById("transferModal").classList.remove("hidden");
            document.getElementById("toAddress").value = a;
        }
    }).catch(e => alert("Camera Error"));
}
function stopScanner() { if(html5QrCode) html5QrCode.stop().then(() => document.getElementById("scannerModal").classList.add("hidden")); }
