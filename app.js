const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, currentType = "";

// India Specific Billers
const operators = {
    mobile: ["Jio Prepaid", "Airtel Prepaid", "Vi Prepaid", "BSNL"],
    electricity: ["Tata Power", "Adani Electricity", "Bescom", "MSEDCL"],
    dth: ["Tata Play", "Airtel DTH", "Dish TV", "Sun Direct"],
    broadband: ["Airtel Xstream", "JioFiber", "ACT Fibernet", "Hathway"],
    train: ["IRCTC General", "Tatkal Booking"],
    bus: ["RedBus", "AbhiBus", "State Roadways"],
    flight: ["IndiGo", "Air India", "SpiceJet"],
    movie: ["BookMyShow", "PVR Cinemas"]
};

const labels = {
    mobile: "Enter Mobile Number",
    electricity: "Enter Consumer Account Number",
    dth: "Enter Smart Card Number",
    broadband: "Enter Subscriber ID",
    train: "Enter PNR / Route Details",
    bus: "Enter Travel Date & Route",
    flight: "Enter Destination",
    movie: "Enter Cinema Name"
};

async function connectWallet() {
    if(!window.ethereum) return alert("Install Wallet");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("walletAddr").innerText = userAddress.slice(0,6)+"..."+userAddress.slice(-4);
    fetchBalance();
    getHistory(5, "latestTxList");
}

function setupBooking(type) {
    currentType = type;
    const box = document.getElementById("bookingBox");
    const opSelect = document.getElementById("operatorSelect");
    const idInput = document.getElementById("bookId");

    box.classList.remove("hidden");
    idInput.placeholder = labels[type];
    
    // Fill India Operators
    opSelect.innerHTML = `<option disabled selected>Select Operator</option>`;
    operators[type].forEach(op => {
        opSelect.innerHTML += `<option value="${op}">${op}</option>`;
    });

    // Scroll to input box
    box.scrollIntoView({ behavior: 'smooth' });
}

async function payBooking() {
    const amt = document.getElementById("bookAmount").value;
    const op = document.getElementById("operatorSelect").value;
    const id = document.getElementById("bookId").value;
    
    if(!amt || op.includes("Select") || !id) return alert("Bhai, saari details bharr pehle!");

    try {
        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(amt, 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        alert(`${currentType.toUpperCase()} Payment for ${op} Success! ✅`);
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Payment Failed!"); }
}

async function fetchBalance() {
    const abi = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(USDC_ADDR, abi, provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -10000, "latest");
        list.innerHTML = logs.slice(-limit).reverse().map(l => `
            <div class="flex justify-between border-b border-white/5 pb-2 text-[10px]">
                <p>To: ${l.args.to.slice(0,12)}...</p>
                <p class="font-bold text-blue-400">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</p>
            </div>`).join('');
    } catch (e) { list.innerHTML = "No Tx Found"; }
}

// Common functions
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function updateInr(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
