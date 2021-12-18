from brownie import Lottery, accounts, network, config
from web3 import Web3

""" 

    We're approximating $50 ~ 0.01134558 ETH
    or 11*10**15

"""


def test_get_entrance_fee():
    account = accounts[0]
    lottery = Lottery.deploy(
        config["networks"][network.show_active()]["eth_usd_price_feed"],
        {"from": account},
    )
    print(f"Fee: {lottery.getEntranceFee()}")
    assert lottery.getEntranceFee() > Web3.toWei(0.011, "ether")
    assert lottery.getEntranceFee() < Web3.toWei(0.022, "ether")
