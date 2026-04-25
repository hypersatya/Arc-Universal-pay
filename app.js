let user;

// 🔗 CONNECT WALLET
async function connect(){
  if(!window.ethereum){
    alert("Install MetaMask");
    return;
  }

  const accounts = await window.ethereum.request({
    method:"eth_requestAccounts"
  });

  user = accounts[0];

  document.getElementById("addr").innerText = user;

  const provider = new ethers.BrowserProvider(window.ethereum);
  const bal = await provider.getBalance(user);

  document.getElementById("balance").innerText =
    "Balance: " + ethers.formatEther(bal) + " ETH";
}

// 💸 SEND ETH
async function send(){
  if(!user){
    alert("Connect wallet first");
    return;
  }

  const amount = document.getElementById("amount").value;

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  try{
    const tx = await signer.sendTransaction({
      to: user,
      value: ethers.parseEther(amount || "0.001")
    });

    await tx.wait();

    alert("Transaction Success 🚀");
  }catch(e){
    alert("Failed ❌");
  }
}
