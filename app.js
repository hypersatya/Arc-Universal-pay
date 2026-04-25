// --- CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN = "0x4cef52";
const INR_RATE = 83.50; 

// --- TRANSACTION FUNCTION ---
async function executeFinalPayment() {
    const btn = document.getElementById("finalPayBtn");
    const targetId = document.getElementById("targetId").value; // Mobile/Consumer ID

    if (!selectedUsdc || selectedUsdc <= 0) return alert("Pehle plan select karo!");

    try {
        btn.innerText = "WAITING FOR WALLET...";
        btn.disabled = true;

        // 1. Check if Signer is ready
        if (!signer) {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
        }

        // 2. Setup Contract
        const abi = [
            "function transfer(address to, uint256 amount) public returns (bool)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);

        // 3. Prepare Amount (USDC usually has 6 decimals)
        const amountToSend = ethers.utils.parseUnits(selectedUsdc.toString(), 6);

        console.log(`Sending ${selectedUsdc} USDC to ${MERCHANT}...`);

        // 4. Send Transaction with dynamic Gas estimation
        const tx = await contract.transfer(MERCHANT, amountToSend, {
            // OKX/MetaMask stability ke liye gas limit manual set kar rahe hain
            gasLimit: 150000, 
            type: 0 // Legacy transaction (EIP-155) for better compatibility
        });

        btn.innerText = "CONFIRMING ON CHAIN...";
        
        // 5. Wait for block confirmation
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            alert(`Payment Success! ✅\nID: ${targetId}\nTx Hash: ${tx.hash}`);
            closeModal('bookingModal');
            fetchBalance();
            getHistory(5, "latestTxList");
        } else {
            throw new Error("Transaction reverted on-chain.");
        }

    } catch (error) {
        console.error("Detailed Error:", error);
        
        // Detailed Alert for Debugging
        if (error.code === 4001) {
            alert("User rejected the request. ❌");
        } else if (error.message.includes("insufficient funds")) {
            alert("Fees ke liye Balance nahi hai! Faucet se Gas maango. ⛽");
        } else {
            alert("Payment Failed! Reason: " + (error.reason || error.message));
        }
    } finally {
        btn.innerText = "PAY & CONFIRM";
        btn.disabled = false;
    }
}
