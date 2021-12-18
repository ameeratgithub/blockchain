let Block = require("./block").Block,
  BlockHeader = require("./block").BlockHeader,
  moment = require("moment"),
  CryptoJS = require("crypto-js"),
  level = require("level"),
  fs = require("fs"),
  db;

let createDb = (peerId) => {
  let dir = __dirname + "/db/" + peerId;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    db = level(dir);
    storeBlock(getGenesisBlock());
  }
};

let storeBlock = (newBlock) => {
  db.put(newBlock.index, JSON.stringify(newBlock), function (err) {
    if (err) return console.log("Ooops! LevelDB error:", err);
    console.log("---- Inserting block index: ", newBlock.index);
  });
};
let getDbBlock = (index, res) => {
  db.get(index, function (err, value) {
    if (err) return res.send(JSON.stringify(err));
    return res.send(value);
  });
};
let getGenesisBlock = () => {
  let blockHeader = new BlockHeader(
    1,
    null,
    "0x1bc3300000000000000000000000000000000000000000000",
    moment().unix()
  );
  return new Block(blockHeader, 0, null);
};

const blockchain = [getGenesisBlock()];

let getLatestBlock = () => blockchain[blockchain.length - 1];

let addBlock = (newBlock) => {
  let prevBlock = getLatestBlock();
  if (
    prevBlock.index < newBlock.index &&
    newBlock.blockHeader.previousBlockHeader ===
      prevBlock.blockHeader.merkleRoot
  ) {
    blockchain.push(newBlock);
  }
};

let getBlock = (index) => {
  if (blockchain.length - 1 >= index) {
    return blockchain[index];
  }
  return null;
};

const generateNexBlock = (txns) => {
  const prevBlock = getLatestBlock(),
    prevMerkleRoot = prevBlock.blockHeader.merkleRoot,
    nextIndex = prevBlock.index + 1,
    nextTime = moment().unix(),
    nextMerkleRoot = CryptoJS.SHA256(1, prevMerkleRoot, nextTime).toString();

  const blockHeader = new BlockHeader(
    1,
    prevMerkleRoot,
    nextMerkleRoot,
    nextTime
  );
  const newBlock = new Block(blockHeader, nextIndex, txns);
  storeBlock(newBlock);
  blockchain.push(newBlock);
  return newBlock;
};
if (typeof exports != "undefined") {
  exports.createDb = createDb;
  exports.getDbBlock = getDbBlock;

  exports.addBlock = addBlock;
  exports.getBlock = getBlock;
  exports.blockchain = blockchain;
  exports.getLatestBlock = getLatestBlock;
  exports.generateNextBlock = generateNexBlock;
}
