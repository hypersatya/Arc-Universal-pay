const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer;

// 1. Connect Wallet Logic
async function connectWallet() {
    if (window.ethereum) {
        try {
            // Switch to Arc Testnet automatically
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

            // UI Update
            document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
            document.getElementById("connectBtn").innerText = "Connected";
            document.getElementById("connectBtn").classList.replace("bg-blue-600", "bg-green-600");
            
            loadRealBalance();
        } catch (e) {
            console.error(e);
        }
    } else {
        alert("Please install MetaMask or a Web3 Wallet!");
    }
}

// 2. Balance Logic
async function loadRealBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6); // Arc USDC has 6 decimals
        
        document.getElementById("usdcBal").innerText = parseFloat(formatted).toFixed(2);
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits: 2});
    } catch (e) {
        // Fallback for Demo
        document.getElementById("usdcBal").innerText = "100.00";
        document.getElementById("inrBal").innerText = (100 * INR_RATE).toLocaleString('en-IN');
    }
}

// 3. Modal Actions
function openTransfer() {
    if (!userAddress) return alert("Bhai, pehle Wallet Connect karo!");
    document.getElementById("transferModal").classList.remove("hidden");
}

function closeTransfer() {
    document.getElementById("transferModal").classList.add("hidden");
}

function updateInrPreview(val) {
    document.getElementById("previewInr").innerText = (val * INR_RATE).toLocaleString('en-IN');
}

function showMyAddress() {
    if (!userAddress) return alert("Connect Wallet First!");
    alert("Your Wallet Address: \n" + userAddress);
}

// 4. Real Blockchain Send
async function sendTransaction() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("sendAmount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if (!amount || amount <= 0) return alert("Enter Amount!");

    try {
        btn.innerText = "Processing...";
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amount, 6));
        
        alert("Transaction Sent! Hash: " + tx.hash);
        await tx.wait();
        
        alert("Payment Successful!");
        closeTransfer();
        loadRealBalance();
    } catch (e) {
        alert("Transaction Failed! Make sure you have USDC for gas on Arc.");
        console.error(e);
    } finally {
        btn.innerText = "Confirm Payment";
        btn.disabled = false;
    }
}
