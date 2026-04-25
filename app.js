const INR_RATE = 83.50; // Current Rate

function checkTypeAndShow() {
    const box = document.getElementById("customAmountBox");
    const plans = document.getElementById("plansBox");
    const payBtn = document.getElementById("finalPayBtn");

    if (currentType === 'mobile') {
        // Mobile ke liye plans dikhao
        box.classList.add("hidden");
        plans.classList.remove("hidden");
        payBtn.classList.add("hidden"); // Plan select hone par dikhega
        loadPlans();
    } else {
        // DTH, Electricity, Broadband ke liye manual amount
        plans.classList.add("hidden");
        box.classList.remove("hidden");
        payBtn.classList.remove("hidden");
        document.getElementById("customInr").value = ""; // Reset
        document.getElementById("convertedUsdc").innerText = "0.00";
    }
}

// INR ko USDC mein badalne ka logic
function convertToUsdc(inrVal) {
    if (!inrVal || inrVal <= 0) {
        document.getElementById("convertedUsdc").innerText = "0.00";
        selectedUsdc = 0;
        return;
    }
    const usdc = (inrVal / INR_RATE).toFixed(2);
    document.getElementById("convertedUsdc").innerText = usdc;
    selectedUsdc = usdc; // Payment ke liye value save
}

// openPopup function mein reset logic
function openPopup(type) {
    currentType = type;
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase();
    document.getElementById("targetId").placeholder = labels[type];
    
    const opSelect = document.getElementById("operatorSelect");
    opSelect.innerHTML = `<option disabled selected>Select Provider</option>`;
    operators[type].forEach(op => { opSelect.innerHTML += `<option value="${op}">${op}</option>`; });

    // Hide everything on start
    document.getElementById("customAmountBox").classList.add("hidden");
    document.getElementById("plansBox").classList.add("hidden");
    document.getElementById("finalPayBtn").classList.add("hidden");
}
