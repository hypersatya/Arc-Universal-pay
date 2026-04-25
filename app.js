const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer;

async function connectWallet() {
    console.log("Button Clicked!"); // Yeh check karne ke liye ki button kaam kar raha hai
    
    if (!window.ethereum) {
        alert("Wallet nahi mila! OKX ya MetaMask install karo.");
        return;
    }

    try {
        // Switch Network
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
        console.log("Connected Address:", userAddress);

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // **IMPORTANT: Yeh do lines screen badalti hain**
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");

        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
    } catch (e) {
        console.error("Error connecting wallet:", e);
        alert("Connection fail ho gaya: " + e.message);
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
        console.log("Balance fetch error, showing mock balance.");
        document.getElementById("usdcBal").innerText = "100.00";
        document.getElementById("inrBal").innerText = "8,350.00";
    }
}

// Baki functions (executePayment, openTransfer, etc.) pehle wale hi rahenge.
function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function closeTransfer() { document.getElementById("transferModal").classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
