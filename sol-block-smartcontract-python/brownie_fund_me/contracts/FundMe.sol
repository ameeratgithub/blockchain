//SPDX-License-Identifier: MIT 

pragma solidity ^0.8.10;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";


contract FundMe{
    mapping(address=>uint256) public addressToAmountFund;

    address[] public funders;
    address public owner;

    AggregatorV3Interface priceFeed;

    constructor(address _priceFeed) {
      priceFeed = AggregatorV3Interface(_priceFeed);
      owner = msg.sender;
    }
    function fund() public payable{
        uint256 minimumUSD  = 50 * (10 ** 18);
        require(getConversion(msg.value) >= minimumUSD, "You need to spend more ETH!");
        addressToAmountFund[msg.sender]+=msg.value;
        funders.push(msg.sender);
    }
    
    function getVersion() public view returns(uint256){
        return priceFeed.version();
    }

    function getPrice() public view returns(uint256){
      (,int256 answer,,,) = priceFeed.latestRoundData();
        return uint256(answer * 10000000000);
    }
    function getEntranceFee() public view returns(uint256){
        //minimum USD
        uint256 minimumUSD = 50*10**18;
        uint256 price = getPrice();
        uint256 precision = 10**18;
        return (minimumUSD * precision) / price;       
    }
    function getConversion(uint256 ethAmount) public view returns(uint256){
      uint256 ethPrice = getPrice();
      uint256 ethAmountUsd = (ethPrice * ethAmount)/1000000000000000000;
      return ethAmountUsd;
    }
    modifier onlyOwner{
      require(msg.sender == owner,"You can't withdraw cause you're not owner");
      _;
    }
    function withdraw() public onlyOwner payable{
      payable(msg.sender).transfer(address(this).balance);
      for(uint256 funderIndex = 0; funderIndex<funders.length;funderIndex++){
        address funder = funders[funderIndex];
        addressToAmountFund[funder]=0;
      }
      funders=new address[](0);
    }
}