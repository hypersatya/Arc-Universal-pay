const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, html5QrCode;

// 1. CONNECT & SETUP
async function connectWallet() {
    if (!window.ethereum) return alert("Bhai, OKX Wallet install kar!");
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

        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-5).toUpperCase();
        
        fetchBalance();
        getHistoryFromChain(); // Real-time history fetch
    } catch (e) { console.error(e); }
}

// 2. REAL BLOCKCHAIN HISTORY
async function getHistoryFromChain() {
    const list = document.getElementById("txHistoryList");
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);

        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -5000, "latest");

        if (logs.length === 0) {
            list.innerHTML = `<div class="text-center opacity-30 py-4 text-xs">No transactions found</div>`;
            return;
        }

        list.innerHTML = logs.slice(-5).reverse().map(log => {
            const val = ethers.utils.formatUnits(log.args.value, 6);
            return `
            <div class="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                    <p class="text-blue-300 font-bold text-[11px]">To: ${log.args.to.slice(0,6)}...${log.args.to.slice(-4)}</p>
                    <p class="opacity-30 text-[9px] uppercase font-bold tracking-tighter">Success ✅</p>
                </div>
                <div class="text-right font-black italic">
                    <p class="text-white text-sm">-${val} USDC</p>
                    <a href="https://testnet.arcscan.app/tx/${log.transactionHash}" target="_blank" class="text-blue-500 text-[9px]">DETAILS</a>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        list.innerHTML = `<div class="text-center opacity-20 py-4 text-xs font-bold">Syncing Failed...</div>`;
    }
}

// 3. SCAN & PAY LOGIC
function startScanner() {
    document.getElementById("scannerModal").classList.remove("hidden");
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            if (ethers.utils.isAddress(decodedText)) {
                stopScanner();
                document.getElementById("transferModal").classList.remove("hidden");
                document.getElementById("toAddress").value = decodedText;
            }
        }
    ).catch(err => alert("Camera Error: " + err));
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById("scannerModal").classList.add("hidden");
        });
    } else {
        document.getElementById("scannerModal").classList.add("hidden");
    }
}

// 4. EXECUTE PAYMENT
async function executePayment() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("amount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to) || !amount) return alert("Detail check kar bhai!");

    try {
        btn.innerText = "SENDING...";
        btn.disabled = true;

        const abi = ["function transfer(address, uint256) returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amount, 6), {
            gasLimit: 120000,
            type: 0 // OKX fix
        });
        
        await tx.wait();
        alert("Payment Done! ✅");
        closeModal('transferModal');
        fetchBalance();
        getHistoryFromChain();
    } catch (e) {
        alert("Transaction Failed! Faucet USDC hai kya?");
    } finally {
        btn.innerText = "CONFIRM PAYMENT";
        btn.disabled = false;
    }
}

// HELPERS
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(formatted).toFixed(2);
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN');
    } catch (e) { document.getElementById("usdcBal").innerText = "100.00"; }
}

function openReceive() {
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("fullAddrDisplay").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}

function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied! ✅"); }
function openTransfer() { document.getElementById("transferModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function updateInrPreview(v) { document.getElementById("previewInr").innerText = (v * INR_RATE).toLocaleString('en-IN'); }
