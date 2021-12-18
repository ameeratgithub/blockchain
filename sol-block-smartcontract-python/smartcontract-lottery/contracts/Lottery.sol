//SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract Lottery is VRFConsumerBase, Ownable {
    enum LOTTERY_STATE {
        OPEN,
        CLOSED,
        CALCULATING_WINNER
    }
    address payable[] public players;

    uint256 public usdEntryFee;
    bytes32 public keyhash;

    AggregatorV3Interface internal ethUsdPriceFeed;
    LOTTERY_STATE public lottery_state;

    uint256 public fee;
    uint256 public randomness;
    address payable public recentWinner; 

    constructor(
        address _priceFeedAddress,
        address _vrfCoordinator,
        address _link,
        uint256 _fee,
        bytes32 _keyhash
    ) VRFConsumerBase(_vrfCoordinator, _link) {
        usdEntryFee = 50 * (10**18); // 50*10**18 WEI / 50 ETH

        //i.e '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'
        ethUsdPriceFeed = AggregatorV3Interface(_priceFeedAddress);

        lottery_state = LOTTERY_STATE.CLOSED;

        fee = _fee;

        keyhash = _keyhash;
    }

    function enter() public payable {
        require(msg.value >= getEntranceFee(), "Not Enough ETH!");
        players.push(payable(msg.sender));
    }

    function getEntranceFee() public view returns (uint256) {
        /* latestRoundData() will give us 8 Decimals */
        (, int256 price, , , ) = ethUsdPriceFeed.latestRoundData();

        uint256 adjustedPrice = uint256(price) * (10**10); // 8 Decimals * 10 Decimals will make it to 18 total

        /* 
            if entry fee is $50, and 1 ETH=$2000
            so $50 in ETH would be 50/2000.
            Since solidty doesn't work with decimals, so we have to do following
            50 * Some_Big_Number / 2000

            if we don't multiply like  entryFee(i.e 50*10**18) * 10**18, we will end up having
            50*10**18/2000*10**18 (1 ETH = $2000) which is bigger than 50, 
            so it will generate a decimal number which is not supported in solidity
         */

        uint256 costToEnter = (usdEntryFee * 10**18) / adjustedPrice;

        return costToEnter; // 50*10**18/2000 = 25*10**15
    }

    function startLottery() public onlyOwner {
        require(
            lottery_state == LOTTERY_STATE.CLOSED,
            "Lottery already has been started"
        );
        lottery_state = LOTTERY_STATE.OPEN;
    }

    function endLottry() public onlyOwner {
        lottery_state = LOTTERY_STATE.CALCULATING_WINNER;
        bytes32 requestId = requestRandomness(keyhash, fee);
    }

    function fulfillRandomness(bytes32 _requestId, uint256 _randomness)
        internal
        override
    {
        require(
            lottery_state == LOTTERY_STATE.CALCULATING_WINNER,
            "You aren't there yet!"
        );
        require(_randomness > 0, "random-not-found");

        uint256 indexOfWinner = _randomness % players.length;
        recentWinner = players[indexOfWinner];
        recentWinner.transfer(address(this).balance);

        /* Reset the lottery */

        players = new address payable[](0);
        lottery_state = LOTTERY_STATE.CLOSED;
        randomness = _randomness;
    }
}
