const path = require("path");
const fs = require("fs");
const solc = require("solc");

const inboxPath = path.resolve(__dirname, "contracts", "inbox.sol");
const source = fs.readFileSync(inboxPath, "utf-8");

const input = {
  language: "Solidity",
  sources: {
    "inbox.sol": {
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

// for (const contract in result.contracts["inbox.sol"]) {
//   const output =
//     contract +
//     ": " +
//     result.contracts["inbox.sol"][contract].evm.bytecode.object;
//   console.log(output);
// }
const Inbox = result.contracts["inbox.sol"].Inbox;
module.exports = Inbox;
