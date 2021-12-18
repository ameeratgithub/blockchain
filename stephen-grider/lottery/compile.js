const path = require("path");
const fs = require("fs");
const solc = require("solc");

const contractName = "lottery.sol";
const inboxPath = path.resolve(__dirname, "contracts", contractName);
const source = fs.readFileSync(inboxPath, "utf-8");

const input = {
  language: "Solidity",
  sources: {
    [contractName]: {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["*"],
      },
    },
  },
};
// console.log(JSON.stringify(source));

const result = JSON.parse(solc.compile(JSON.stringify(input)));

// console.log(result.contracts);
const Lottery = result.contracts[contractName].Lottery;
module.exports = Lottery;
