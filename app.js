const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, currentType = "";

const operators = {
    mobile: ["Jio Prepaid", "Airtel Prepaid", "Vi Prepaid", "BSNL"],
    electricity: ["Tata Power", "Adani Electricity", "Bescom", "MSEDCL"],
    dth: ["Tata Play", "Airtel DTH", "Dish TV", "Sun Direct"],
    broadband: ["Airtel Xstream", "JioFiber", "ACT Fibernet", "Hathway"],
    train: ["IRCTC General", "Tatkal Booking"],
    bus: ["RedBus", "AbhiBus", "Zingbus"],
    flight: ["IndiGo", "Air India", "SpiceJet"],
    movie: ["BookMyShow", "PVR Cinemas"]
};

const labels = {
    mobile: "Enter Mobile Number",
    electricity: "Enter Consumer ID",
    dth: "Enter Smart Card ID",
    broadband: "Enter Subscriber ID",
    train: "Enter PNR Details",
    bus: "Enter Travel Date",
    flight: "Enter Destination",
    movie: "Enter Cinema Name"
};

const subNotes = {
    mobile: "1.5GB/Day | 28 Days Plan",
    electricity: "Avg Units: 142 kWh",
    dth: "Family HD Pack included",
    broadband: "100 Mbps Unlimited Data",
    train: "Confirmed Seat Selection",
    bus: "AC Luxury Sleeper",
    flight: "Domestic Flight Booking",
    movie: "Multiplex Seat Selection"
};

// --- POPUP TRIGGER ---
function openBookingPopup(type) {
    currentType = type;
    const modal = document.getElementById("bookingModal");
    const title = document.getElementById("modalTitle");
    const opSelect = document.getElementById("operatorSelect");
    const idInput = document.getElementById("bookId");
    const note = document.getElementById("bookNote");

    title.innerText = type.toUpperCase() + " PAYMENT";
    idInput.placeholder = labels[type];
    note.innerText = subNotes[type];

    // Fill Dropdown
    opSelect.innerHTML = `<option disabled selected>Select Operator</option>`;
    operators[type].forEach(op => {
        opSelect.innerHTML += `<option value="${op}">${op}</option>`;
    });

    modal.classList.remove("hidden");
}

async function payBooking() {
    const amt = document.getElementById("bookAmount").value;
    const op = document.getElementById("operatorSelect").value;
    const id = document.getElementById("bookId").value;
    const btn = document.getElementById("finalPayBtn");

    if(!amt || op.includes("Select") || !id) return alert("Details bharo bhai!");

    try {
        btn.innerText = "PROCESSING...";
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(amt, 6), { gasLimit: 120000, type: 0 });
        
        await tx.wait();
        alert(`${currentType.toUpperCase()} Bill Success ✅`);
        closeModal('bookingModal');
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Payment Failed!"); }
    finally {
        btn.innerText = "PAY & CONFIRM";
        btn.disabled = false;
    }
}

// ... Baki Connect, Balance aur History functions pehle wale hi rahenge ...
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
