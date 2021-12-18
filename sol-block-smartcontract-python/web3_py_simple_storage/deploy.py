from solcx import compile_standard, install_solc
import json
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
with open("./SimpleStorage.sol", "r") as file:
    simple_storage_file = file.read()

# Install solc 0.8.10
install_solc("0.8.10")

# Compile solidity
compiled_solidity = compile_standard(
    {
        "language": "Solidity",
        "sources": {"SimpleStorage.sol": {"content": simple_storage_file}},
        "settings": {
            "evmVersion":"byzantium",
            "outputSelection": {
                "*": {"*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]}
            }
        },
    },
    solc_version="0.8.10",
)

# print(compiled_solidity)


with open("compiled_code.json", "w") as file:
    json.dump(compiled_solidity, file)

# Get byte-code
byte_code = compiled_solidity["contracts"]["SimpleStorage.sol"]["SimpleStorage"]["evm"][
    "bytecode"
]["object"]

# Get abi
abi = compiled_solidity["contracts"]["SimpleStorage.sol"]["SimpleStorage"]["abi"]

# for connecting to ganache
# w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

# for connecting to rinkeby testnet through infura
w3 = Web3(Web3.HTTPProvider("https://rinkeby.infura.io/v3/07e17c859daf4b8dabfda54ab5f12608"))
chain_id = 4

# Local ganache-cli address
#my_address = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"

# Ethereum address
my_address = "0x336a54857551a7eCff5D334D1e43fda6866F6696"
private_key = os.getenv("PRIVATE_KEY")
print(private_key)
# Create Contract In Python
SimpleStorage = w3.eth.contract(abi=abi, bytecode=byte_code)

# Get latest transaction
nonce = w3.eth.getTransactionCount(my_address)

# 1. Build a transaction
# 2. Sign a transaction
# 3. Send a transaction
transaction = SimpleStorage.constructor().buildTransaction(
    {
        "gasPrice": w3.eth.gas_price,
        "chainId": chain_id,
        "from": my_address,
        "nonce": nonce,
    }
)
# print(transaction)

signed_txn = w3.eth.account.sign_transaction(transaction, private_key=private_key)

# Send this signed transaction
print("Deploying contract...")
tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print("Contract deployed...!")
# Working with Contract, you need:
#   1. Contract ABI
#   2. Contract Address
simple_storage = w3.eth.contract(address=tx_receipt.contractAddress, abi=abi)

# Call -> Simulate making the call and getting a return value
# Transact ->   Actually make a state change

# Initial value of favorite number
print(simple_storage.functions.retrieve().call())
print("Updating contract...")
store_transaction = simple_storage.functions.store(15).buildTransaction(
    {
        "from": my_address,
        "chainId": chain_id,
        "nonce": nonce + 1,
        "gasPrice": w3.eth.gas_price,
    }
)

signed_store_tx = w3.eth.account.sign_transaction(store_transaction, private_key = private_key)
store_tx_hash = w3.eth.send_raw_transaction(signed_store_tx.rawTransaction)
store_tx_receipt = w3.eth.wait_for_transaction_receipt(store_tx_hash)
# print("Transaction receipt")
# print(store_tx_receipt)
print("Contract updated...!")
print(simple_storage.functions.retrieve().call())