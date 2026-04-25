let userAddress = "";

async function connectWallet() {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    userAddress = accounts[0];

    document.getElementById("status").innerText =
      "Connected: " + userAddress;
  } else {
    alert("Install wallet");
  }
}

function smartRoute(amount) {
  if (amount < 50) {
    return "Direct Send";
  } else {
    return "Bridge via CCTP";
  }
}

function send() {
  const amount = document.getElementById("amount").value;

  const route = smartRoute(amount);

  document.getElementById("status").innerText =
    "Routing: " + route + " → " + amount + " USDC";
}
