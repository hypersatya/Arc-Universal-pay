const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x3224B02278b1A1f163622D8B3396D2D8D6e4E4B3"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, currentType = "";

const details = {
    mobile: "Plan: 1.5GB/Day | Validity: 28 Days",
    electricity: "Units: 142 kWh (Last Month)",
    dth: "Pack: Family HD | 30 Days",
    broadband: "Speed: 100 Mbps | Data: Unlimited",
    train: "IRCTC PNR Status & Seat Booking",
    bus: "Intercity AC Sleeper Booking",
    flight: "Domestic & International Flight Tickets",
    movie: "BookMyShow Movie Tickets"
};

// ... Baki connectWallet, fetchBalance, getHistory functions same rahenge (Previous Code se le sakte hain) ...

function setupBooking(type) {
    currentType = type;
    document.getElementById("bookingBox").classList.remove("hidden");
    document.getElementById("bookDetail").innerText = details[type];
    document.getElementById("bookId").placeholder = `Enter ${type.toUpperCase()} Details`;
}

async function payBooking() {
    const amt = document.getElementById("bookAmount").value;
    const id = document.getElementById("bookId").value;
    if(!amt || !id) return alert("Details bharo!");
    
    try {
        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(amt, 6), { gasLimit: 120000, type: 0 });
        await tx.wait();
        alert(`${currentType.toUpperCase()} Success! ✅`);
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Fail!"); }
}
