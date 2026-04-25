const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID_HEX = "0x4cef52"; 
const INR_RATE = 83.50;

let userAddress = "";
let provider, signer, html5QrCode;

// 1. Connection & Dashboard Load
async function connectWallet() {
    if (!window.ethereum) return alert("Install OKX Wallet!");
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_CHAIN_ID_HEX }],
        }).catch(async (err) => {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID_HEX,
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
        getHistoryFromChain();
    } catch (e) { console.error(e); }
}

// 2. SCAN & PAY (FIXED SCANNING)
function startScanner() {
    document.getElementById("scannerModal").classList.remove("hidden");
    html5QrCode = new Html5Qrcode("reader");
    
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
            // Clean the address (remove 'ethereum:' prefix if present)
            let cleanAddr = decodedText.replace("ethereum:", "").split("@")[0].trim();
            
            if (ethers.utils.isAddress(cleanAddr)) {
                console.log("Valid Address Scanned:", cleanAddr);
                stopScanner();
                document.getElementById("transferModal").classList.remove("hidden");
                document.getElementById("toAddress").value = cleanAddr;
            } else {
                console.log("Scanned text is not a valid Web3 address.");
            }
        },
        (errorMessage) => { /* Ignore constant errors */ }
    ).catch(err => {
        alert("Camera Error: Check Permissions!");
        document.getElementById("scannerModal").classList.add("hidden");
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById("scannerModal").classList.add("hidden");
            html5QrCode = null;
        }).catch(err => {
            document.getElementById("scannerModal").classList.add("hidden");
        });
    }
}

// 3. ON-CHAIN HISTORY FETCH
async function getHistoryFromChain() {
    const list = document.getElementById("txHistoryList");
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);

        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -10000, "latest");

        if (logs.length === 0) {
            list.innerHTML = `<div class="text-center opacity-30 py-4 text-[10px] uppercase font-bold italic">No Transactions Found</div>`;
            return;
        }

        list.innerHTML = logs.slice(-5).reverse().map(log => {
            const val = ethers.utils.formatUnits(log.args.value, 6);
            return `
            <div class="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                    <p class="text-blue-300 font-bold text-[11px]">To: ${log.args.to.slice(0,6)}...${log.args.to.slice(-4)}</p>
                    <p class="opacity-30 text-[9px] uppercase font-bold italic tracking-tighter">Confirmed</p>
                </div>
                <div class="text-right font-black italic uppercase">
                    <p class="text-white text-sm">-${val} USDC</p>
                    <a href="https://testnet.arcscan.app/tx/${log.transactionHash}" target="_blank" class="text-blue-500 text-[9px] tracking-widest">Details</a>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        list.innerHTML = `<div class="text-center opacity-20 py-4 text-xs">History Sync Failed</div>`;
    }
}

// 4. EXECUTE PAYMENT
async function executePayment() {
    const to = document.getElementById("toAddress").value;
    const amount = document.getElementById("amount").value;
    const btn = document.getElementById("finalSendBtn");

    if (!ethers.utils.isAddress(to) || !amount) return alert("Sahi details dalo!");

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
        
        await tx.wait();
        alert("Payment Success! ✅");
        closeModal('transferModal');
        fetchBalance();
        getHistoryFromChain();
    } catch (e) {
        alert("Transaction Failed! Faucet check karo.");
    } finally {
        btn.innerText = "CONFIRM SEND";
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
        document.getElementById("inrBal").innerText = (formatted * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits: 2});
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
