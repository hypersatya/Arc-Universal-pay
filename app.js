const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const CHAIN_ID = "0x4cef52"; 
const RATE = 83.50;

let provider, signer, user;

async function connect() {
    if(!window.ethereum) return alert("Install MetaMask!");
    
    try {
        // Auto-switch to Arc Testnet
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_ID }],
        }).catch(async (e) => {
            if(e.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: CHAIN_ID,
                        chainName: "Arc Testnet",
                        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                        rpcUrls: ["https://rpc.testnet.arc.network/"],
                        blockExplorerUrls: ["https://testnet.arcscan.app/"]
                    }]
                });
            }
        });

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        user = accounts[0];
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        document.getElementById('addr').innerText = user.slice(0,4) + "..." + user.slice(-5);
        document.getElementById('connectBtn').innerText = "Connected";
        
        getBal();
    } catch(e) { console.log(e); }
}

async function getBal() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns(uint256)"], provider);
        const b = await contract.balanceOf(user);
        const formatted = ethers.utils.formatUnits(b, 6);
        
        document.getElementById('usdcBal').innerText = parseFloat(formatted).toFixed(2);
        document.getElementById('inrBal').innerText = (formatted * RATE).toLocaleString('en-IN');
    } catch(e) { 
        document.getElementById('usdcBal').innerText = "100.00"; // Demo fallback
        document.getElementById('inrBal').innerText = "8,350.00";
    }
}

function openModal() { if(!user) return connect(); document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
function calcINR(v) { document.getElementById('preview').innerText = (v * RATE).toLocaleString('en-IN'); }

async function sendUSDC() {
    const to = document.getElementById('to').value;
    const amount = document.getElementById('amt').value;
    const btn = document.getElementById('sendBtn');

    if(!ethers.utils.isAddress(to)) return alert("Invalid Address");
    
    try {
        btn.innerText = "Sending...";
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns(bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amount, 6));
        await tx.wait();
        alert("Success!");
        closeModal();
        getBal();
    } catch(e) { alert("Error! Check Gas (USDC)"); btn.innerText = "Confirm Send"; }
}
