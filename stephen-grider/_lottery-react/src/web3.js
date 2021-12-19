import Web3 from "web3";

(async function () {
  await window.ethereum.enable();

  await window.ethereum.request({ method: "eth_accounts" });
})();

const web3 = new Web3(window.ethereum);

export default web3;
