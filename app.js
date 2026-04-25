let provider, signer, user;

function tab(id, el){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  el.classList.add("active");

  ["send","multi","scan","receive"].forEach(i=>{
    document.getElementById(i).style.display="none";
  });

  document.getElementById(id).style.display="block";
}

async function connect(){
  if(!window.ethereum) return alert("Install wallet");

  await window.ethereum.request({method:"eth_requestAccounts"});
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  user = await signer.getAddress();

  document.getElementById("addr").innerText = user;
  document.getElementById("myAddr").innerText = user;
}

async function send(){
  const to = document.getElementById("to").value;
  const amt = document.getElementById("amount").value;

  const tx = await signer.sendTransaction({
    to,
    value: ethers.utils.parseEther(amt)
  });

  alert("Tx Sent: " + tx.hash);
}

async function multiSend(){
  const data = document.getElementById("multiData").value.split("\n");

  for(let line of data){
    let [addr, amt] = line.split(",");
    await signer.sendTransaction({
      to: addr,
      value: ethers.utils.parseEther(amt)
    });
  }

  alert("All sent");
}

async function scanPay(){
  const addr = document.getElementById("scanAddr").value;
  const amt = document.getElementById("scanAmt").value;

  const tx = await signer.sendTransaction({
    to: addr,
    value: ethers.utils.parseEther(amt)
  });

  alert("Paid: " + tx.hash);
}
