const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer;

// 1. GATEKEEPER CONNECT
async function connectWallet() {
    if (!window.ethereum) return alert("Please install OKX or MetaMask!");
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_CHAIN_ID }],
        }).catch(async (err) => {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: "Arc Testnet",
                        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                        rpcUrls: ["https://rpc.testnet.arc.network/"],
                        blockExplorerUrls: ["https://testnet.arcscan.app/"]
                    }]
                });
            }
        });

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // UI Transition
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
    } catch (e) { alert("Error connecting: " + e.message); }
}

// 2. FETCH BALANCE
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(formatted).toFixed(2);
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits: 2});
    } catch (e) { 
        document.getElementById("usdcBal").innerText = "0.00"; 
    }
}

// 3. EXECUTE PAYMENT (OKX ERROR FIX)
async function executePayment() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("amount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to)) return alert("Recipient Address Galat Hai!");
    if (!amount || amount <= 0) return alert("Sahi Amount Daalo!");

    try {
        btn.innerText = "PROCESSING...";
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const units = ethers.utils.parseUnits(amount, 6);

        // --- OKX WALLET LEGACY FIX ---
        const tx = await contract.transfer(to, units, {
            gasLimit: 120000, 
            gasPrice: await provider.getGasPrice(),
            type: 0 // Legacy mode for better wallet compatibility
        });
        
        document.getElementById("txStatus").innerHTML = `Processing: <span class="text-blue-400">${tx.hash.slice(0,15)}...</span>`;
        
        await tx.wait();
        alert("Payment Successful! ✅");
        document.getElementById("txStatus").innerText = "Last Transaction: Success ✅";
        
        closeTransfer();
        fetchBalance();
    } catch (e) {
        console.error(e);
        if (e.message.includes("insufficient funds")) {
            alert("Error: Aapke paas fees (USDC) nahi hai. Faucet se USDC claim karo!");
        } else {
            alert("Payment Reverted. Check Console for details.");
        }
    } finally {
        btn.innerText = "CONFIRM SEND";
        btn.disabled = false;
    }
}

// HELPERS
function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function closeTransfer() { document.getElementById("transferModal").classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
function showMyAddress() { alert("Your Wallet: " + userAddress); }
