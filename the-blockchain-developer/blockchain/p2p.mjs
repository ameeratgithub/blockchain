// const crypto = require("crypto");

import crypto from "crypto";
import Swarm from "discovery-swarm";
// defaults = require("");
import defaults from "dat-swarm-defaults";
//   getPort = require("get-port");
import getPort from "get-port";
import { createRequire } from "module";

import express from "express";
import bodyParser from "body-parser";

const require = createRequire(import.meta.url);

const chain = require("./chain");
let CronJob = require("cron").CronJob;
let wallet = require("./wallet");

const peers = {};
let connSeq = 0;
let channel = "myBlockchain";

const myPeerId = crypto.randomBytes(32);
console.log("myPeerId: " + myPeerId.toString("hex"));

const config = defaults({
  id: myPeerId,
});

const swarm = Swarm(config);

let MessageType = {
  REQUEST_BLOCK: "requestBlock",
  RECEIVE_NEXT_BLOCK: "receiveNextBlock",
  RECEIVE_NEW_BLOCK: "receiveNewBlock",
  REQUEST_ALL_REGISTER_MINERS: "requestAllRegisteredMiners",
  REGISTER_MINER: "registerMiner",
};

let registeredMiners = [];
let lastBlockMinedBy = null;

chain.createDb(myPeerId.toString("hex"));

(async () => {
  const port = await getPort();
  swarm.listen(port);
  console.log("Listening port: " + port);

  swarm.join(channel);
  swarm.on("connection", (conn, info) => {
    const seq = connSeq;
    const peerId = info.id.toString("hex");
    console.log(`Connected #${seq} to peer: ${peerId}`);

    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600);
      } catch (exception) {
        console.log("Exception: " + exception);
      }
    }

    conn.on("data", (data) => {
      let message = JSON.parse(data);

      console.log(
        "------------------- Received Message Start ----------------------"
      );
      console.log(
        "from: " + peerId.toString("hex"),
        "to: " + peerId.toString(message.to),
        "my: " + myPeerId.toString("hex"),
        "type: " + JSON.stringify(message.type)
      );
      console.log(
        "------------------- Received Message End ----------------------"
      );

      switch (message.type) {
        case MessageType.REQUEST_BLOCK:
          console.log("----------- REQUEST_BLOCK -------------");

          let requestedIndex = JSON.parse(JSON.stringify(message.data)).index;

          let requestedBlock = chain.getBlock(requestedIndex);

          if (requestedBlock) {
            writeMessageToPeerToId(
              peerId.toString("hex"),
              MessageType.RECEIVE_NEXT_BLOCK,
              requestedBlock
            );
          } else {
            console.log("No block found @ index: " + requestedIndex);
          }
          console.log("------------ REQUEST_BLOCK --------------");
          break;

        case MessageType.RECEIVE_NEXT_BLOCK:
          console.log("----------- RECEIVE_NEXT_BLOCK --------------");

          chain.addBlock(JSON.parse(JSON.stringify(message.data)));

          console.log(JSON.stringify(chain.blockchain));

          let nextBlockIndex = chain.getLatestBlock().index + 1;

          console.log("-- request next block @ index: " + nextBlockIndex);

          writeMessageToPeers(MessageType.REQUEST_BLOCK, {
            index: nextBlockIndex,
          });
          console.log("---------------- RECEIVE_NEXT_BLOCK---------------");
          break;
        case MessageType.REQUEST_ALL_REGISTER_MINERS:
          console.log(
            "------------ REQUEST_ALL_REGISTER_MINERS ----------- " + message.to
          );
          writeMessageToPeers(MessageType.REGISTER_MINER, registeredMiners);
          registeredMiners = JSON.parse(JSON.stringify(message.data));
          console.log(
            "---------- REQUEST_ALL_REGISTER_MINERS -----------",
            message.to
          );
          break;
        case MessageType.REGISTER_MINER:
          console.log("----------- REGISTER_MINER ------------", message.to);
          let miners = JSON.stringify(message.data);
          registeredMiners = JSON.parse(miners);
          console.log(registeredMiners);
          console.log(
            "--------------REGISTER_MINER---------------",
            message.to
          );
          break;
        case MessageType.RECEIVE_NEW_BLOCK:
          if (
            message.to === myPeerId.toString("hex") &&
            message.from !== myPeerId.toString("hex")
          ) {
            console.log("------------ RECEIVE_NEW_BLOCK---------", message.to);

            chain.addBlock(JSON.parse(JSON.stringify(message.data)));

            console.log(JSON.stringify(chain.blockchain));

            console.log("------------ RECEIVE_NEW_BLOCK---------", message.to);
          }
          break;
      }
    });

    conn.on("close", () => {
      console.log(`Connection ${seq} closed, peerId: ${peerId}`);

      if (peers[peerId].seq === seq) {
        delete peers[peerId];

        console.log(
          "------------ Registered Miners before: " +
            JSON.stringify(registeredMiners)
        );

        let index = registeredMiners.indexOf(peerId);
        if (index > -1) {
          registeredMiners.splice(index, 1);
        }
        console.log(
          "------ Resgistered Miners end: " + JSON.stringify(registeredMiners)
        );
      }
    });

    if (!peers[peerId]) {
      peers[peerId] = {};
    }

    peers[peerId].conn = conn;
    peers[peerId].seq = seq;
    connSeq++;
  });
})();

const job = new CronJob("30 * * * * *", function () {
  let index = 0;
  if (lastBlockMinedBy) {
    let newIndex = registeredMiners.indexOf(lastBlockMinedBy);
    index = newIndex + 1 > registeredMiners.length - 1 ? 0 : newIndex + 1;
  }
  lastBlockMinedBy = registeredMiners[index];

  console.log(
    "-- REQUESTING NEW BLOCK FROM: " +
      registeredMiners[index] +
      ", index: " +
      index
  );
  console.log(JSON.stringify(registeredMiners));

  if (registeredMiners[index] === myPeerId.toString("hex")) {
    console.log("------------- create next block ---------------");

    let newBlock = chain.generateNextBlock(null);
    chain.addBlock(newBlock);

    console.log(JSON.stringify(newBlock));
    writeMessageToPeers(MessageType.RECEIVE_NEW_BLOCK, newBlock);

    console.log(JSON.stringify(chain.blockchain));
    console.log("------------- create next block ---------------");
  }
});
job.start();
setTimeout(function () {
  writeMessageToPeers(MessageType.REQUEST_ALL_REGISTER_MINERS, null);
}, 5000);

setTimeout(function () {
  registeredMiners.push(myPeerId.toString("hex"));
  console.log("------------- Register my miner -------------");
  console.log(registeredMiners);
  writeMessageToPeers(MessageType.REGISTER_MINER, registeredMiners);
  console.log("------------- Register my miner -------------");
}, 7000);

const writeMessageToPeers = (type, data) => {
  for (let id in peers) {
    writeMessage(id, type, data, "writeMessageToPeers");
  }
};
const writeMessage = (id, type, data, functionName) => {
  console.log(`--------- ${functionName} started ---------`);
  console.log("type: " + type + ", to: " + id);
  console.log(`--------- ${functionName} end ----------`);
  sendMessage(id, type, data);
};

const writeMessageToPeerToId = (toId, type, data) => {
  for (let id in peers) {
    if (id === toId) {
      writeMessage(id, type, data, "writeMessageToPeerToId");
    }
  }
};

const sendMessage = (id, type, data) => {
  peers[id].conn.write(
    JSON.stringify({
      to: id,
      from: myPeerId,
      type,
      data,
    })
  );
};

let initHttpServer = (port) => {
  let http_port = "80" + port.toString().slice(-2);

  let app = express();

  app.use(bodyParser.json());

  app.get("/blocks", (req, res) => res.send(JSON.stringify(chain.blockchain)));

  app.get("/getBlock", (req, res) => {
    let blockIndex = req.query.index;
    res.send(chain.blockchain[blockIndex]);
  });

  app.get("/getDBBlock", (req, res) => {
    let blockIndex = req.query.index;
    chain.getDbBlock(blockIndex, res);
  });

  app.get("/getWallet", (req, res) => {
    res.send(wallet.initWallet());
  });

  app.listen(http_port, () =>
    console.log("Listening http on port: " + http_port)
  );
};

(async () => {
  const port = await getPort();
  initHttpServer(port);
})();
