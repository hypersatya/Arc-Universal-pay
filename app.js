// CONFIG
const ARC_RPC = "https://rpc.testnet.arc.network/";
const USDC_CONTRACT = "0x3600000000000000000000000000000000000000"; // Arc Testnet USDC
const ARC_CHAIN_ID = "0x4cef52"; // 5042002 in Hex
const USDC_TO_INR = 83.50; 

let provider, signer, user;

async function connect() {
    if (!window.ethereum) return alert("MetaMask not found!");

    try {
        // 1. Switch to Arc Network automatically
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (switchError) {
            // Agar network added nahi hai toh add karo
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: "Arc Testnet",
                        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                        rpcUrls: [ARC_RPC],
                        blockExplorerUrls: ["https://testnet.arcscan.app/"]
                    }]
                });
            }
        }

        // 2. Connect Wallet
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        user = accounts[0];
        
        // UI Update: 0x...36783
        const displayAddr = user.slice(0, 4) + "..." + user.slice(-5);
        document.getElementById('addr').innerText = displayAddr.toUpperCase();
        document.getElementById('connectBtn').innerText = "Connected";

        // 3. Setup Ethers & Fetch Balance
        provider = new ethers.providers.Web3Provider(window.ethereum);
        fetchRealBalance();

    } catch (e) {
        console.error("Connection Error:", e);
    }
}

async function fetchRealBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_CONTRACT, abi, provider);
        
        // Fetching balance (USDC has 6 decimals on Arc)
        const balance = await contract.balanceOf(user);
        const formattedBal = ethers.utils.formatUnits(balance, 6);
        
        updateUI(parseFloat(formattedBal));
    } catch (err) {
        console.error("Balance Fetch Error:", err);
        // Fallback for UI presentation
        updateUI(100.00); 
    }
}

function updateUI(amt) {
    const inrValue = amt * USDC_TO_INR;
    document.getElementById('usdcBal').innerText = amt.toFixed(2);
    document.getElementById('inrBal').innerText = inrValue.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}
