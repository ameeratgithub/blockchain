// SPDX-License-Identifier: GPL-3.0


pragma solidity 0.8.10;

contract SimpleStorage{
    
    // this will get initialized to 0!
    uint256 favoriteNumber;
    
    
    struct People{
        uint256 favoriteNumber;
        string name; 
    }
    
    People public person = People({
      favoriteNumber: 10,
      name : "Hamza"
    });
    
    People[] public people;
    
    mapping (string=>uint256) public nameToFavNum;
    
    function store(uint256 _favoriteNumber) public returns(uint256){
        favoriteNumber = _favoriteNumber;
        return favoriteNumber;
    }
    
    // view, pure are for reading(returning any value/variable) in a transaction
    function retrieve() public view returns(uint256){
        return favoriteNumber;
    }    
    
    function addPerson(string memory _name, uint256 _favoriteNumber) public{
        people.push(People(_favoriteNumber, _name));
        nameToFavNum[_name] = _favoriteNumber;
    }
}