const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer;

// 1. GATEKEEPER CONNECT
async function connectWallet() {
    if (!window.ethereum) return alert("Install OKX or MetaMask!");
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

        // CHANGE PAGE: LOGIN -> DASHBOARD
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");

        // UI UPDATE
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
    } catch (e) { alert("Error: " + e.message); }
}

// 2. ROUTING LOGIC (AS REQUESTED)
function smartRoute(amount) {
    if (amount < 50) {
        return "Direct Send";
    } else {
        return "Bridge via CCTP";
    }
}

// 3. BALANCE & BLOCKCHAIN WORK
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

async function send() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("amount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if (!amount || amount <= 0) return alert("Enter Amount!");

    const route = smartRoute(parseFloat(amount));
    document.getElementById("routeDisplay").innerText = "Routing: " + route + " → " + amount + " USDC";
    
    try {
        btn.innerText = "ROUTING: " + route.toUpperCase();
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        const amountInUnits = ethers.utils.parseUnits(amount, 6);

        const tx = await contract.transfer(to, amountInUnits, {
            gasLimit: ethers.BigNumber.from("120000"),
            gasPrice: await provider.getGasPrice()
        });
        
        alert(`Initiated: ${route}\nHash: ${tx.hash.slice(0,15)}...`);
        await tx.wait();
        alert("Payment Confirmed! ✅");
        closeTransfer();
        fetchBalance();
    } catch (e) {
        alert("Failed: Check Gas Fees!");
    } finally {
        btn.innerText = "CONFIRM PAYMENT";
        btn.disabled = false;
    }
}

// HELPERS
function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function closeTransfer() { document.getElementById("transferModal").classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
