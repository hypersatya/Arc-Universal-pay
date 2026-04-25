const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer;

// 1. Connect Wallet & Auto Network Switch
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

        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        document.getElementById("connectBtn").innerText = "Connected";
        document.getElementById("connectBtn").className = "bg-green-600 text-white text-xs font-bold px-5 py-2 rounded-full";
        
        fetchBalance();
    } catch (e) { alert("Connection Error: " + e.message); }
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(formatted).toFixed(2);
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN');
    } catch (e) { document.getElementById("usdcBal").innerText = "0.00"; }
}

// 2. Smart Route Logic (Tera wala)
function smartRoute(amount) {
    if (amount < 50) {
        return "Direct Send";
    } else {
        return "Bridge via CCTP";
    }
}

// 3. Send Function (Final Working Version)
async function send() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("amount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!userAddress) return alert("Pehle Wallet Connect kar bhai!");
    if (!ethers.utils.isAddress(to)) return alert("Invalid Recipient Address!");
    if (!amount || amount <= 0) return alert("Enter valid Amount!");

    const route = smartRoute(parseFloat(amount));
    
    try {
        btn.innerText = "ROUTING: " + route.toUpperCase();
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        const amountInUnits = ethers.utils.parseUnits(amount, 6);

        // --- OKX WALLET GAS FIX ---
        const tx = await contract.transfer(to, amountInUnits, {
            gasLimit: ethers.BigNumber.from("120000"), // Fixed limit for stability
            gasPrice: await provider.getGasPrice()    // Network current fee
        });
        
        document.getElementById("status").innerText = `Routing: ${route} → ${amount} USDC`;
        alert(`Route: ${route}\nTx Hash: ${tx.hash.slice(0,15)}...`);
        
        await tx.wait();
        alert("Transaction Confirmed! ✅");
        closeTransfer();
        fetchBalance();

    } catch (e) {
        console.error(e);
        if (e.message.includes("insufficient funds")) {
            alert("Error: Wallet mein Fees (USDC) nahi hai!");
        } else {
            alert("Transaction Failed! Arc Testnet require USDC for gas.");
        }
    } finally {
        btn.innerText = "CONFIRM PAYMENT";
        btn.disabled = false;
    }
}

// Helpers
function openTransfer() { if(userAddress) document.getElementById("transferModal").classList.remove("hidden"); else connectWallet(); }
function closeTransfer() { document.getElementById("transferModal").classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
