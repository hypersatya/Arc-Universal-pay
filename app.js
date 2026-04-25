const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer;

async function connectWallet() {
    console.log("Connect button pressed...");
    
    if (!window.ethereum) {
        alert("Bhai, OKX ya MetaMask install karo!");
        return;
    }

    try {
        // Network Check
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
        console.log("Wallet Connected:", userAddress);

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // --- SCREEN SWITCHING LOGIC ---
        console.log("Switching screens...");
        const loginEl = document.getElementById("loginScreen");
        const dashEl = document.getElementById("dashboard");

        if (loginEl && dashEl) {
            loginEl.classList.add("hidden");
            dashEl.classList.remove("hidden");
            console.log("Dashboard should now be visible");
        } else {
            console.error("IDs not found! Check index.html for loginScreen and dashboard");
        }

        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
    } catch (e) {
        console.error("Error:", e);
        alert("Connection failed: " + e.message);
    }
}

async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6);
        
        document.getElementById("usdcBal").innerText = parseFloat(formatted).toFixed(2);
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits: 2});
    } catch (e) {
        console.log("Showing mock balance for testing.");
        document.getElementById("usdcBal").innerText = "100.00";
        document.getElementById("inrBal").innerText = "8,350.00";
    }
}

async function executePayment() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("amount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!to || !amount) return alert("Details fill karo!");

    try {
        btn.innerText = "SENDING...";
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        const units = ethers.utils.parseUnits(amount, 6);

        const tx = await contract.transfer(to, units, {
            gasLimit: 120000,
            gasPrice: await provider.getGasPrice(),
            type: 0 
        });
        
        alert("Tx Sent! Hash: " + tx.hash.slice(0,15));
        await tx.wait();
        alert("Success! ✅");
        closeTransfer();
        fetchBalance();
    } catch (e) {
        console.error(e);
        alert("Failed! Check USDC for fees.");
    } finally {
        btn.innerText = "CONFIRM SEND";
        btn.disabled = false;
    }
}

function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function closeTransfer() { document.getElementById("transferModal").classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
