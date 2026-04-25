let userAddress = "";
let provider, signer;

// 1. Connection Logic (Blockchain se handshake)
async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    
    signer = provider.getSigner();
    userAddress = accounts[0];

    // UI Update: Last 5 digits format (as you requested before)
    const displayAddr = userAddress.slice(0, 6) + "..." + userAddress.slice(-5);
    document.getElementById("status").innerText = "Connected: " + displayAddr;
    
    // Asli balance fetch karo
    getRealBalance();
  } else {
    alert("Please install MetaMask!");
  }
}

// 2. Routing Logic (Decision making)
function smartRoute(amount) {
  // Yeh decision sirf UI dikhane ke liye hai
  return amount < 50 ? "Direct Send" : "Bridge via CCTP";
}

// 3. SEND Function (Ye hai asli Blockchain work)
async function send() {
  const amount = document.getElementById("amount").value;
  if (!amount || !userAddress) return alert("Connect wallet & enter amount");

  const route = smartRoute(amount);
  document.getElementById("status").innerText = "Routing via " + route + "...";

  try {
    // USDC Contract Address on Arc Testnet
    const usdcAddr = "0x3600000000000000000000000000000000000000";
    
    // USDC ka Standard Transfer ABI
    const abi = ["function transfer(address, uint256) returns (bool)"];
    
    // Contract se connect karo
    const usdcContract = new ethers.Contract(usdcAddr, abi, signer);

    // Recipient address (Yahan aap dummy ya input se le sakte ho)
    const to = "0x000000000000000000000000000000000000dEaD"; 

    // Amount ko Blockchain units mein convert karo (USDC has 6 decimals)
    const amountInUnits = ethers.utils.parseUnits(amount, 6);

    // TRANSACTION TRIGGER! (Yahan user ko MetaMask popup aayega)
    const tx = await usdcContract.transfer(to, amountInUnits);
    
    document.getElementById("status").innerText = "Tx Pending: " + tx.hash.slice(0,10) + "...";

    // Wait for confirmation
    await tx.wait();
    
    document.getElementById("status").innerText = "Success! Sent " + amount + " USDC";
  } catch (error) {
    console.error(error);
    document.getElementById("status").innerText = "Transaction Failed!";
  }
}
