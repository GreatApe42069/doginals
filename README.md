# 🐶 Đoginals Unleashed v4.2.0

ℹ️ This is a Fork of a Fork, of a Fork, to create the Ultimate Degen Fork for all things **Doginals!!!**  Much Retard Activated, So Insane!!!!

- This is a fork/based on [apezord/ord-dogecoin](https://github.com/apezord/ord-dogecoin)
- This is a fork/based on [apezord/doginals](https://github.com/apezord/doginals)
- This is a fork/based on [BigChiefs/doginals](https://github.com/martinseeger2002/doginals)
- This is also a fork/based on[sirduney/dunes-cli](https://github.com//sirduney/dunes-cli))
- This is also a fork/based on[dpaydrc20/Delegates](https://github.com/dpaydrc20/Delegates))

***Much Madness!!!!!!!***

## 🔍 Overview
### Doginals - Dogecoin Protocol & Inscriptions CLI Tool

A comprehensive minter and protocol for all inscriptions on Dogecoin, now updated with added support for Delegation rights, Doginal NFT Inscriptions, DRC-20, Dunes, Dogemaps, DNS, and marketplace interactions, and advanced UTXO handling on Dogecoin. In this repo is the full UNLEASHED & ENHANCED  `doginals.js` script with the necessary coresponding files, updates, instructions, and examples to handle delegate and child inscriptions, Regular Doginal NFT Inscriptions, DRC-20, Dunes, Dogemaps, DNS, and limited marketplace interactions "again, we're working on it". Also included in repo is n original `doginals.js Readme.md`, a `Delegates.md`, `DNS.md`, and `Dunes.md file detailing each iindividual protocol in depth, for better understanding.


## ⚠️⚠️⚠️ Important ⚠️⚠️⚠️

### ‼️ DISCLAIMER: THIS CODE MAY STILL HAVE BUGS️, AS ITS STILL IN ONGOING DEVELOPMENT AND TESTING STAGES....‼️
Use this script with a wallet for Dogecoin, Doge inscriptions, and Dunes only! Always mint to a different address to be safe, you can then change wallet info in wallet.json import it to node an see all your holdings with our script. The wallet used is not meant for storing funds or assets long-term, were getting there....Much Patience, but as of now its not perfect its a interface script to help you interact and  access all things Doginals!!!


## 📦 Features

- 🔍 Full Inscription Support & detection (images, video,audio, webp, html, scripts, JSON, dogemaps, dns, dunes, drc20s, etc.)
- ✅ Full DRC-20 support (deploy, mint, transfer, burn, Supports standard (`drc-20`) and legacy (`drct`) formats, 3- or 4- tickers)
- 🌐 DNS support 
- 🗺️ Dogemap support (text or MIME based)
- 💼 Delegate Support
- ⛏️ Dunes protocol Full support (now supports delegate images and apply pay terms)
- 🔐 Single-address UTXO wallet
- 🧠 Smart classification of inscriptions by MIME/content
- 🔄 Optional express server integration
- 🔁 Auto-recovery of pending transactions (`pending-txs.json`)
- Marketplace**: Full interaction with Doggy.market and Dogelabs.
- RPC/API**: Prioritizes RPC with ORD API backup.

### 🧠 Mempool Intelligence:

- Doginals now tracks mempool depth, fee spread, and TX chains.
- Broadcasts delay if mempool congestion is too high.
- Reattempts TXs once chain clears.
- ⚡ Broadcast retry handling for `too-long-mempool-chain` errors
- 🧮 Dynamic fee adjustment based on mempool congestion
- 📊 Rebuild wallet logic to detect orphaned or missing TXs
- 🚫 UTXO reuse protection (via `utxo.json`)
- 📤 `show-pending` CLI command for mempool insight
- 🔁 TX retry logic from `pending-txs.json`
- 🛑 Prevents usage of mempool-reserved UTXOs
- 📦 RPC batching support for large wallets (planned)


### 🛰️ Pending TX Rebroadcast Loop:

- On startup, script checks `pending-txs.json`.
- Rebroadcasts any stuck transactions.
- Dynamically adjusts fees if needed.
- Auto-clears once all TXs confirm.


***Mempool metrics extracted:***

```
Total TXs
Chain length
Fee histogram
Peak TX age
Longest TX chain
```

## Prerequisites / Installation

### Install NodeJS

- **Node.js**: Install from [nodejs.org](https://nodejs.org/en/download).
- **Dogecoin RPC**: Access via a local node or a service like [getblock.io](https://getblock.io/).

### Install Dogecoin Core 

### Switch to rpcauth for Explicit RPC an generated password for anonymity:

Here’s how to do it:

##### Step 1: Install Python 3, Alternatively, if you don’t have Python, use an online HMAC-SHA256 generator to manually verify, but `rpcuser.py` is recommended for accuracy. Download `rpcuser.py` (e.g., from this repo if you clone it or Dogecoins GitHub) save in your Doginals directory


#### Step 2: Generate `rpcauth`

Use the scrpt `rpcuser.py` (available in this repo and online or from Dogecoin repo) to generate a new `rpcauth`

```
python rpcuser.py rpc_user
```

Output examples all passwords etc. They are examples Please dont message me saying Bro you left your password in the repo, they're examples *for those who would actually message me THANKS though*:

```
String to be appended to dogecoin.conf:
rpcauth=rpc_user:some_salt$some_hash
Your password:
lcvR6SVXU2j4k7XGByNmxl_yaM3FfHJU3HABp5VIksc
```
***notes is says append `Your password:
lcvR6SVXU2j4k7XGByNmxl_yaM3FfHJU3HABp5VIksc` DO NOT, only this line `rpcauth=rpc_user:some_salt$some_hash` goes in .conf file pass word goes in `.env. see examples for .env an .conf***


### ⚠️⚠️⚠️ Important ⚠️⚠️⚠️

**Update your dogcoin.conf file example:**

#### Step 3: Update `dogecoin.conf`

Edit `C:\Users\<YOUR PC USER NAME>\AppData\Roaming\Dogecoin\dogecoin.conf` and replace the `rpcauth` line with the new one. For example:

```
rpcport=22555
txindex=1
server=1
rpcauth=rpc_user:some_salt$some_hash
rpcbind=127.0.0.1
rpcallowip=127.0.0.1/32
```

Save the file.


##### Step 4: Restart the Dogecoin Node

Stop and restart the node:

- **Stop**:
  ```powershell
  dogecoin-cli stop
  ```
  Wait a few seconds for it to shut down

- **Start**:

  ```
  & "C:\Program Files\Dogecoin\dogecoin-qt.exe" -server -conf="C:\Users\<YOUR PC USER NAME>\AppData\Roaming\Dogecoin\dogecoin.conf"
  ```
  Or, if using `dogecoind`:

  ```
  dogecoind -daemon
  ```

#### Step 5: Test Authentication

Verify with `dogecoin-cli`:

```
Get-Content "C:\Users\<YOUR PC USER NAME>\AppData\Roaming\Dogecoin\.cookie"
```

```
dogecoin-cli --rpcconnect=127.0.0.1 --rpcport=22555 -rpcuser=__cookie__ --rpcpassword=75651a077ea579babd3298edoGeCoIn42069a5e4089610dc1a81eb1eb63b6fd706baa7d getblockchaininfo
```

OUTPUT: __cookie__:75651a077ea579babd3298edoGeCoIn42069a5e4089610dc1a81eb1eb63b6fd706baa7d


```
dogecoin-cli --rpcconnect=127.0.0.1 --rpcport=22555 --rpcuser=rpc_user --rpcpassword=lcvR6SVXU2j4k7XGByNmxl_yaM3FfHJU3HABp5VIksc getblockchaininfo
```

If it returns blockchain info (like your cookie test), it’s working. If it fails, double-check the `rpcauth` generation and file edits.


***Additional settings to consider adding to dogecoin.conf:***

- daemon=1: Runs the node in the background.

- datadir=/path/to/dogecoin/data: Specifies where blockchain data is stored (optional, defaults to ~/.dogecoin on Linux).

- maxconnections=16: Limits the number of peer connections (adjust based on your system’s capacity).

- rpcallowip=192.168.1.0/24: If you need RPC access from other devices on your local network (e.g., 192.168.1.x), add this with caution and ensure a strong rpcauth password.


Save the dogecoin.conf file in the Dogecoin data directory:

- Linux: ~/.dogecoin/

- Windows: %appdata%\Dogecoin\

- macOS: ~/Library/Application Support/Dogecoin/


***Extra Security Tips***

Keep rpcbind and rpcallowip restricted to 127.0.0.1 unless you need remote access.
Use a strong, unique password in rpcauth.
Enable a firewall to block port 22555 from external access.
Back up your wallet.dat file (in the data directory) and secure it.


### Install Doginals

**Clone the repository and install dependencies:**

```
git clone https://github.com/your-repo/doginals.git
cd <path to your doginals folder, e.g."C:\Doginals-main">
npm install
npm audit fix
```

OR

- Download the repo by clicking <>code in the uper right of the GitHub and clicking Download ZIP                
- Extract the root folder to your root dir.

Using the terimnal install. 

```
cd <path to your doginals folder>
npm install
npm audit fix
``` 

*After all dependencies are solved, you can configure the environment:*


#### ⚙️ Configure Environment Setup

**configure your `.env` and add your node information:**

Copy this .env.example to .env and configure with your env settings (e.g. RPC_PASS,RPC_USER,FEE_PER_KB, etc.)

```
PROTOCOL_IDENTIFIER=D
NODE_RPC_URL=http://127.0.0.1:22555
NODE_RPC_USER=rpc_user
NODE_RPC_PASS=<REPLACE only this line with YOUR rpuser.py generated Password>
TESTNET=false
DYNAMIC_FEES=false      // set to "true" to enable dynamic fees for high congestion
FEE_PER_KB=50000000
UNSPENT_API=https://unspent.dogeord.io/api/v1/address/unspent/ 
ORD=https://wonky-ord-v2.dogeord.io/
DRC20_API=https://api.ordifind.com/drc20/balance/
DOGGY_MARKET_API=https://api.doggy.market/
WALLET=.wallet.json
SERVER_PORT=3000
```

Verify it

```
Get-Content "C:\Doginals-main\.env"
```

it should look like this:

```
PROTOCOL_IDENTIFIER=D
NODE_RPC_URL=http://127.0.0.1:22555
NODE_RPC_USER=rpc_user
NODE_RPC_PASS=lcvR6SVXU2j4k7XGByNmxl_yaM3FfHJU3HABp5VIksc
TESTNET=false
DYNAMIC_FEES=false
FEE_PER_KB=50000000
UNSPENT_API=https://unspent.dogeord.io/api/v1/address/unspent/  // Optional
ORD=https://wonky-ord-v2.dogeord.io/
DRC20_API=https://api.ordifind.com/drc20/balance/
DOGGY_MARKET_API=https://api.doggy.market/
WALLET=.wallet.json
SERVER_PORT=3000
```

Adjust FEE_PER_KB based on network conditions 
configuration support for RPC, FEE, ORD endpoint, etc.
+ optional dynamic fee control (requires node for rpc calls)
You can also get the current fee per kb from [here](https://mempool.jhoenicke.de/#DOGE,8h,weight) or (check blockchair.com)

or from node enter command:

```
dogecoin-cli estimatefee 8
```

OUTPUT: 0.01002330


### Funding

#### Using CLI

**Import the private key to core ~/dogecoin-1.14.7/bin/ directory and you want to run the dogecoin-cli:**
run:
```
./dogecoin-cli 
```

```
importprivkey <your_private_key> <optional_label> false
```

#### Using QT

Go to

`Settings>Options>Wallets>Enable coin control`

Create a new wallet from shell

```
node . wallet new
```

- After creating your doginals wallet copy your private key created an now in your Doginals-main (.wallet.json) an time to fund your wallet so its ready to use

## Funding your Wallet:

- Then Open DogecoinQT

- File>Import Private Key

- Paste private key and name wallet

- Fund wallet: Send DOGE to the address


### Commands

**CLI help**

```
node doginals.js --help
```

After you Send DOGE to the address displayed. Once sent, sync your wallet with command:

```
cd <path to your doginals folder>
```

then...

```
node . wallet sync
```

If you are minting a lot, you can split up your UTXOs:

```
node . wallet split <count>
```

When you are done minting, send the funds back:

```
node . wallet send <address> <optional amount>
```

## 🔐 Wallet Files

- .wallet.json – main wallet and UTXOs

- utxo.json – UTXOs seen in mempool, reserved to avoid double use, Stores seen-but-unconfirmed UTXOs (prevents reuse of UTXOs still in mempool)

- pending-txs.json – Tracks pending TXs not yet confirmed (rebroadcast safe) Transactions being rebroadcast and complete all transactions left to finish the inscriptions encoding process of inscribing, when inscribing large files 

- mempool.json – Full mempool snapshot from RPC of node mempool, used for dynamic fee control and congestion handling

- .env – configuration for RPC, FEE, ORD endpoint, etc.


### Wallet Operations

**Create a new wallet**

```
node . wallet new
```
*Output: Creates a new wallet and outputs the address, save address and key in .wallet.json , client display e.g.*

```
D9UcJkdirVLY11UtF77WnC8peg6xRYsogu
```

**Sync UTXOs**

```
node . wallet sync
```

*Output: Syncs UTXOs and displays balance, e.g.* 

```
Wallet synced: D9UcJkdirVLY11UtF77WnC8peg6xRYsogu Balance: 10.5 DOGE
```

**Check wallet balance**

```
node . wallet balance
```

```
PS C:\Doginals-main> node . wallet sync
Syncing UTXOs with RPC and ORD API...
RPC fetched 5 UTXOs
ORD API fetched 6 UTXOs
Total unique UTXOs: 6

Wallet synced:

"1st Apestract Doginals Inscriber"
DEtfMQ1Kc97g2MnaKhNMkU7CRX7sr15Pvi

- Total Balance: 1.07706341 DOGE
- Spendable Balance: 1.07306341 DOGE
- Total Inscriptions: 4 (Value: 0.00400000 DOGE)
- Doginal\NFT Inscriptions: 1 (Value: 0.00100000 DOGE)
- Dunes: 1 (Value: 0.00100000 DOGE)
 * SNOOP•DOGE•COIN: 42 🔥
- DRC-20: 1 (Value: 0.00100000 DOGE)
 * DOGX: 100
- DNS: 0 (Value: 0.00000000 DOGE)
- Dogemaps: 1 (Value: 0.00100000 DOGE)
 * 1488914.dogemap
- Delegates: 0 (Value: 0.00000000 DOGE)
- Other Inscriptions: 0 (Value: 0.00000000 DOGE)
```

**Send DOGE**

```
`node . wallet send <address> <amount> [Optional message up to 50 chars]`

```
```
node . wallet send DC8iWykpcZS6HVZdCNLvJehunRyXotGoHH 5 "Such Sending You a Message in OP RETURN"
```

Output: Sends 5 DOGE, e.g., 

`TXID: 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e`


**Send a specific UTXO**

`node . wallet sendutxo <txid> <vout> <destination> [Optional message up to 50 chars]`

```
node . wallet sendutxo 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e 0 DAbcdefghijklmnopqrstuvwxyz1234567890 "Such Sending a Message in OP RETURN"
```

Output: Sends UTXO, e.g., `TXID: abc123....`


**Split funds into <splits> equal UTXOs**

`node . wallet split <splits>`

e.g.

```
node . wallet split 4
```



**Rebuild-wallet Enhancements**

✅ Now scans for:

- Orphaned UTXOs

- TXs marked as broadcasted but not confirmed

- Cleans .wallet.json Re-syncs wallet UTXOs and reclassify inscriptions and reindexes based on confirmed chain state

**Rebuild Wallet**

```
node . rebuild-wallet
```

**Show Pendingending UTXOs**

***Shows human-readable UTXOs currently seen in mempool, with txid, vout, and amount, List mempool-visible UTXOs (from utxo.json)***

```
node . show-pending
```

Index mempool and flags unconfirmed UTXOs

```
node . index-mempool
```


### Minting

#### Inscription Minting

***Examples:***

*[Optional message] = adds OP_RETURN inscription (max 50 chars)*

**From file:**

`node . mint <address> <path> [Optional message up to 50 chars ⚠️ Wrap optional messages in quotes if they contain spaces]`

```
node . mint D9UcJkdirVLY11UtF77WnC8peg6xRYsogu C:\doginals-main\ApeStractArtCollecton\DPAYSTONE.html "Message Me in the OP Return"
```

**From data:**

`node . mint <address> <content type> <hex data> [Optional message up to 50 chars ⚠️ Wrap optional messages in quotes if they contain spaces]`

```
node . mint D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "text/plain;charset=utf-8" 576f6f6621 "message anyone in op return"
```

Output: Mints `"Woof!"`, e.g., `Minted TXID: abc123....`


### DRC-20 Operations

***Examples:***

**Single or Batch Mint drc20 tokens**

`node . doge20 mint <address> <ticker> <amount> [repeat]` 

`[repeat]`: (Optional) Number of times to repeat the minting transaction (e.g., `5` to mint 5 times defaulting to 1 if not provided)

```
node . doge20 mint D9UcJkdirVLY11UtF77WnC8peg6xRYsogu WOOF 1000 5
```

Output: `Mints 1000 WOOF 5 times` e.g.,

```
Minting DRC-20 token: WOOF, 1 of 5
DRC-20 mint TXID: abc123...
Minting DRC-20 token: WOOF, 2 of 5
DRC-20 mint TXID: def456...
...
```

**Max Mint**

`node . doge20 mint <address> <ticker> <total> <max mint>`

```
node . doge20 mint D9pqzxiiUke5eodEzMmxZAxpFcbvwuM4Hg DFAT 100000000 100000000
```


**Drc20 Deploy**

Deploy a token (3-4 letter ticker) // decimal precision (optional), per‑ordinal mint limit (optional in deploy)


`node . doge20 deploy <address> <ticker> <max> <limit> [decimals]`

```
node . doge20 deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu WOOF 21000000 1000 18
```

Output: Deploys `WOOF` token, e.g., `DRC-20 Deploy TXID: 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e`

Note: Supports both "drc-20" and legacy "drct" protocol identifiers 


**Drc20 Transfer**

***Transfer tokens***

`node . doge20 transfer <address> <ticker> <amount> <to> [repeat]`


`node . doge20 Transfer <tick> <amount> <Doge Address sending to> <repeat number of mints you want to mint to transfer >`

```
node . doge20 transfer D9UcJkdirVLY11UtF77WnC8peg6xRYsogu WOOF 500 DAbcdefghijklmnopqrstuvwxyz1234567890 1
```

Output: `Transfers 500 WOOF`, e.g., `DRC-20 transfer TXID: ghi789....`


```
node . doge20 transfer D9UcJkdirVLY11UtF77WnC8peg6xRYsogu WOOF 500 DAbcdefghijklmnopqrstuvwxyz1234567890 2
```

Output: `Transfers 1000 WOOF`, e.g., 

`DRC-20 transfer TXID: ghi7x89....`
`DRC-20 transfer TXID: gdfxX790....`

**Burn DRC-20 Tokens**

`node . doge20 burn <address> <ticker> <amount>`

Example:

```
Output: Burns 100 WOOF, e.g., `DRC-20 burn TXID: xyz789...
```

**DRC20Command schema:**

interface DRC20Command

```
 {
  p: "drc-20";
  op: "deploy" | "mint" | "transfer";
  tick: string;          // 4‑letter ticker
  max?: string;          // uint cap (deploy only)
  lim?: string;          // per‑inscription cap (deploy only)
  dec?: string;          // decimals (deploy only)
  amt?: string;          // amount (mint/transfer)
  to?: string;           // recipient address (transfer)
}
```

example for ref:

```
{
  "p": "drc-20",      // protocol identifier
  "op": "deploy|mint|transfer",
  "tick": "WOOF",     // 4‑letter ticker
  "max": "21000000",  // max supply (deploy only)
  "lim": "1000",      // per‑ordinal mint limit (optional in deploy)
  "dec": "18",        // decimal precision (optional)
  "amt": "1000",      // mint amount (mint only)
  "to": "DOGE_ADDRESS"// (transfer only; specify recipient)
}
```

**Deploy Operation**

Example:
`{ "p":"drc-20", "op":"deploy", "tick":"woof", "max":"21000000", "lim":"1000" }`
Defines ticker, total supply limit, mint cap per ordinal, decimals defaulting to `18` Cannot be changed post-deployment. 

*This JSON schema is the core DRC‑20 standard, making it compatible with any indexer*

***Other Notable Extensions:***

`Accepts "p":"drc‑20" or legacy "p":"drct" (for older inscriptions)`

*Allows for `3` or `4` letter tickers in deploy supporting backward‑compatibility*

*Supports extended meta object as well:*

***Example:***

```
{
  "p":"drc-20",
  "op":"deploy",
  "tick":"DOG",
  "max":"1000000",
  "meta": {
    "deployer": "DABC…",
    "timestamp": 1720431234
  }
}
```

*Under the hood it calls the same parsing utilities as ord, but with custom regexes for Some Super Degen Dogecoin scripts*

***MUCH LFG!!!*** 


### DNS Operations

***Example:***

**Deploy a DNS namespace**

`node . dns deploy <namespace> [about] [avatar]`

```
node . dns deploy mynamespace "A cool namespace" "https://example.com/avatar.png"
```

Output: Deploys namespace, e.g., 

`Namespace TXID: 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e`


**Register a DNS name**

Simple Registration

`node . dns reg <name>`

```
node . dns reg myname
```

Output: Registers simple name, e.g., `Name TXID: def456....`


**Advanced Registration**


`node . dns reg <name> [avatar] [rev] [relay]`

```
node . dns reg myname "https://example.com/avatar.png" "reverse_addr" "relay_addr"
```

Output: Registers name, e.g., `Name TXID: abc123....`


### Dogemaps Operations

***Dogemaps are identified as inscriptions with content type `text/plain` and data matching `<number>.dogemap` (e.g., `123.dogemap`). Currently, they are classified as of now and have no specific Minting deploying Function, or command logic implemented, to be fair there is no clearly defined public documentation. Full dogemap Functions & commands are planned but not yet fully implemented in doginals.js 🗺️ Dogemaps features work a little bit, note it is under development but not priority at moment***

**Mint a Dogemap maybe we can get around to it soon......**


### Dunes Operations

#### Pay Terms (New)


##### Apply Pay Terms

***You can now **charge a mint price** on your Dune etchings:***

- **priceAmount**  
  A u128 string of shibes (1 DOGE = 100 000 000 shibes) to charge per mint, or `null` to disable fees.

- **pricePayTo**  
  A Dogecoin address to receive collected fees, or `null`.

When **both** `priceAmount` and `pricePayTo` are set in the `deployOpenDune` command, your Dune will carry on‑chain pay terms. Minters must pay that fee, and proceeds go straight to the specified address.

**Example with Pay Terms**:

```
node dunes.js deployOpenDune \
  'RANDOM•DUNE•NAME' \
  'R' \
  100000000 \
  8 \
  null null null null \
  100 \
  100000000 \
  false \
  true \
  e6c6efe91b6084eae2c8a2fd6470d3d0dbfbb342f1b8601904f45be8095058e2i0 \
  5000000 \
  DDogeFeeRecipientAddress
```

***Important Notes:***
"apply pay terms” is the Key: it lets you set a mint price (in “shibes”) and specify who gets paid when someone mints a Dune. Previously, we could only open‐mint with limits, caps, and block‑height restrictions, etc.; now we can also monetize it by charging a fee and directing that fee to an address of your choice.
You also refactored the internal broadcast() function’s retryAsync call so it passes the helper directly instead of wrapping it in an extra async lambda:

res = await retryAsync(async () => await makePostRequest(), 10, 30000);
res = await retryAsync(makePostRequest, 10, 30000);
This doesn’t change behavior, it does makes the retry logic a bit cleaner!

Why im Digging this upgrade???
Monetization: Projects can now sustainably fund themselves by charging a shibe‑denominated mint fee.

**Flexibility:**

 Since the fee is just another field in the Terms object, it’s fully optional, so if you don’t want a fee, you pass "null" and everything behaves exactly like before.
Such Flexibility!!!

**Backward‑compatible:**

Existing scripts and deployments that never set a price will continue to work unchanged.

**Decentralization & Dogecoin ethics:**

***On‑chain enforcement only:***

 All the fee logic happens in your local CLI client and then on‑chain via the same RPC calls and smart‑contract‑style logic Dunes has always used. There’s no off‑chain "Gatekeeper" or "Centralized service" validating payments.

**User choice:**

 Anyone can deploy an open mint with or without a fee; you’re not forced to pay if you don’t want to.

**Transparent rules:**

All parameters (limits, heights, offsets, fees, pay‑to address) are encoded in the same public transaction data we’ve always put on Dogecoin.

**No new trust assumptions:**

You still only need to trust the Dogecoin network itself and your own keypair....there’s no additional trusted infrastructure introduced.

*In short, it’s Such a clean, opt‑in extension that preserves the fully decentralized ethos of Dogecoin.*

*Much Innovation, Such Decentralized, So Dunes
Well done Fam! Thanks for the Great Idea [***"@reallyshadydev"***](https://x.com/@reallyshadydev)


**Deploy a Dune:**
***Examples:***

`node . dunes deploy <tick> <symbol> <limit> <divisibility> <cap> <heightStart> <heightEnd> <offsetStart> <offsetEnd> <premine> <turbo> <openMint> [parentId] [priceAmount] [pricePayTo]`

**Basic Deploy**

```
node . dunes deploy "RANDOM•DUNE" R 100000000 8 null null null null 100 true true
```

**With Apply Pay Terms**

```
node . dunes deploy "RANDOM•DUNE" R 100000000 8 null null null null 100 true true null 5000000 D9UcJkdirVLY11UtF77WnC8peg6xRYsogu
```

Just adds a price of 0.05 DOGE (5000000 satoshis) paid to D9UcJkdirVLY11UtF77WnC8peg6xRYsogu


**With Apply Pay Terms and Delegation**

```
node . dunes deploy "RANDOM•DUNE" R 100000000 8 null null null null 100 true true 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62ei0 5000000 D9UcJkdirVLY11UtF77WnC8peg6xRYsogu
```

**Deploy with Delegate**

```
node . dunes deploy "RANDOM•DUNE" R 100000000 8 null null null null 100 true true 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62ei0 
```

**Mint a Dune**

`node . dunes mint <id> <amount> <receiver>`

```
node . dunes mint 1234:0 1000 D9UcJkdirVLY11UtF77WnC8peg6xRYsogu
```

Output: Mints 1000 units, e.g., Dune minted with tx hash: ghi789....


**Batch mint Dunes**

`node . dunes batchMint <id> <amount> <count> <receiver>`

```
node . dunes batchMint 1234:0 1000 5 D9UcJkdirVLY11UtF77WnC8peg6xRYsogu
```

Output: Batch mints 5 times, e.g.,

```
Batch mint 1/5 TXID: jkl012...
Batch mint 2/5 TXID: mno345...
...
```

**Transfer a Dune**

`node . dunes transfer <txhash> <vout> <dune> <amount> <to address>`

```
node . dunes transfer 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e 0 "RANDOM•DUNE" 500 DAbcdefghijklmnopqrstuvwxyz1234567890
```

Output: Transfers 500 units, e.g., Dune transferred with tx hash: pqr678....


**Send to multiple wallets**

`node . dunes sendMultiwallet <txhash> <vout> <dune> <decimals> <amounts> <addresses>`

```
node . dunes sendMultiwallet 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e 0 "RANDOM•DUNE" 8 "100,200" "DAbcdefghijklmnopqrstuvwxyz1234567890,DBcdefghijklmnopqrstuvwxyz1234567890A"
```

Output: Sends to multiple wallets, e.g., Dune sent to multiple wallets with tx hash: stu901....


**Send without protocol message**
*`sendNoProtocol` supports optional OP Return  messaging, but all other dunes commands omitted because they are used in protocol*


`node . dunes sendNoProtocol <address> <utxo-amount> <dune> [Optional Message to send in OP RETURN]`

```
node . dunes sendNoProtocol D9UcJkdirVLY11UtF77WnC8peg6xRYsogu 3 "RANDOM•DUNE" "Sending Dunes Message in OP RETURN"
```

Output: Sends without protocol, e.g., Dunes sent without protocol with tx hash: vwx234....


#### Utility Commands

**List all Dunes in wallet**

```
node . printDunes
```

Output: Lists dunes, e.g., Dunes: [{ "dune": "RANDOM•DUNE", "amount": "1000" }]


**Check Dune balance**

```
node . printDuneBalance <dune_name> [address]
```

```
node . printDuneBalance "RANDOM•DUNE" D9UcJkdirVLY11UtF77WnC8peg6xRYsogu
```

Output: Displays balance, e.g., 1000 RANDOM•DUNE


**List spendable UTXOs**

Print only Spendable & Safe UTXOs

```
node . printSafeUtxos
```
Output: Lists UTXOs, e.g., Safe UTXOs: [{ "txid": "15f3b73...", "vout": 0, "satoshis": 1049700000 }] // Each UTXO shown is safe to spend. `satoshis` = value in DOGE × 100,000,000


**Print All UTXOs**

```
node . printAllUtxos
```


**Decode a Dune Script**

Parses the `scriptPubKey.asm` string from a transaction output (vout). This helps reveal Dune protocol data from raw TXs.

***Usage:***

`node . decodeDunesScript <script>`


**Example:**

From `decoderawtransaction`, suppose you get this from the output script:
```json
"scriptPubKey": {
  "asm": "OP_RETURN 44 7b2270223a2264756e65222c226f70223a226465706c6f79222c..."
}
```
You would decode it like this:

```
node . decodeDunesScript "OP_RETURN 44 7b2270223a2264756e65222c226f70223a226465706c6f79222c..."
```

***Decoded Dune Script:***

```
{
  "protocol": "dune",
  "op": "deploy",
  "tick": "RANDOM•DUNE",
  "limit": "100000000",
  ...
}
```

**Tip: You can extract this from a TX using:**

```
dogecoin-cli getrawtransaction <txid> 1
```

Then look at: vout[n].scriptPubKey.asm


### ✅ Why This Fix Is Important

- Shows where to extract the script from.
- Provides a **copy-pasteable** example with realistic data.
- Clarifies the format (asm-style, not hex).


### Delegates:

Delegation is supported via the `mint` command by referencing an existing inscription ID (`delegateTxId`). Full delegate commands (`deploy`, `transfer`) are implemented in doginals.js now.

**Mint with Delegate**

#### Parameters for flexible control over the delegation's rights and constraints:

***When setting up delegation in your Doginals system, you can define custom parameters for flexible control over the delegation's rights and constraints. Here are some useful parameters you could add to extend the functionality and specificity of your delegation setup:***

##### 1. Permission Level (permission_level)

- Description: Specifies the scope or intensity of the rights granted. This could be a simple label like "view", "mint", or "transfer", defining the exact actions the delegated address can perform.

***Example:***

`"mint_only", "full_access"`

Usage:

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "mint_only" 5000`


##### 2. Expiration Date (expiration)

- Description: Sets a time limit for the delegation’s validity. After this date, the delegate rights automatically expire, and the delegated address loses access.

- Format: ISO 8601 (e.g., "2024-12-31T23:59:59Z")

***Example:***

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "creator_rights" 5000 "2024-12-31T23:59:59Z"`

##### 3. Allowed Content Types (content_types)

- Description: Limits the types of content (e.g., images, text, audio) that the delegate can mint or interact with. Useful for specific applications where delegates should only handle certain media types.

***Example:***

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "image_only" 1000 "image/jpeg,image/png"`

##### 4. Rate Limit (rate_limit)

- Description: Defines how frequently the delegate can perform actions (e.g., number of mints per day). This rate-limiting mechanism prevents excessive actions within a short timeframe.

- Format: Numeric, representing actions per time period.

***Example:***

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "mint_limited" 500 "10_per_day"`

##### 5. Geographic or IP Restrictions (geo_restrictions or ip_whitelist)

- Description: Restricts the delegate's actions to specific geographic regions or IP addresses. Useful for regionalized deployments or to limit actions to a trusted network.

***Example:***

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "regional_rights" 1000 "US,CA"`

- Alternatively:

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "secured_access" 1000 "192.168.1.0/24"`

##### 6. Transfer Rights (can_transfer)

- Description: Indicates whether the delegate can transfer or assign its rights to another address. This can either be "true" or "false".

***Example:***

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "creator_rights" 5000 "true"`

##### 7. Usage Restriction by Wallet Balance (min_wallet_balance)

- Description: Requires the delegated wallet to hold a minimum balance to exercise its rights. This can be useful to ensure certain actions are limited to wallets with enough DOGE to support fees or transaction requirements.

- Example:

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "premium_access" 1000 "1000_DOGE"`

##### 8. Custom Metadata (metadata)
Description: Allows additional metadata fields relevant to specific applications, such as tags, labels, or notes describing the delegation.

***Example:***

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "creator_rights" 5000 "Event_2024"`


#### Putting It All Together

With these parameters, your command to deploy a delegation might look like this:

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "mint_only" 1000 "2024-12-31T23:59:59Z" "image/jpeg,image/png" "10_per_day" "true" "1000_DOGE" "Event_2024"`


***These parameters give you a lot of flexibility in tailoring delegation to specific use cases, ensuring that each delegated address has clear, enforceable permissions.***



##### Creating a Delegate Inscription

To support delegates in your doginals.js script, here are the delegate-specific commands and example usages for your Doginal NFT project:

##### Delegate Commands & Examples

**Deploying & Minting with Delegation**

*Setting Up Delegate Parameters for Deployment If delegates are part of a broader setup (such as transferring rights or permissions in your Doginal ecosystem), you might need to expand delegate functionality by creating an initial delegation deployment.*

**Delegate deploy Command:**
`node . delegate deploy <address> <delegate_param1> <delegate_param2>`

***Example:***

`node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "creator_rights" 5000`

Output: Deploys delegate, e.g., `Delegate Deploy TXID: 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e`

This example deploys a delegate with creator_rights and assigns a limit of 5000 to this delegation setup.
Transferring Delegated Rights Use this if you need to transfer or reassign delegated rights within the Doginal ecosystem.

##### Breakdown of What This Command Does

**Delegate Rights to an Address (Wallet):**

Here, you’re effectively assigning or deploying a set of rights to a specific Dogecoin address (`D9UcJkdirVLY11UtF77WnC8peg6xRYsogu` in this example). This address now holds the rights to a specific delegated operation, such as minting or transferring.

The creator_rights parameter is an arbitrary string that represents a type of right or permission you’re defining for this address, indicating what kind of delegated power this address has.

Deployment (delegate deploy) sets up a new delegation reference, associating a wallet with specific rights.
DelegateTxId is an identifier to be used later on for minting, transferring, etc., using those delegated rights.

Limit provides a cap on the actions the delegated address can perform.


**Inscription ID / Delegation Reference:**

This example doesn't involve an inscription ID directly but instead is setting up a new delegation that could be referenced in future commands.
The 5000 is an example of a quantity or limit associated with the rights—meaning this address might be allowed to perform this delegated action (like minting or transferring) up to 5000 times.


**Real-World Analogy:**

Think of this as setting up a "minting allowance" or "minting quota" for this specific wallet. Once deployed, the delegate allows the specified address to perform actions on behalf of the delegator (like minting NFTs or transferring tokens) up to the specified limit.

#### Following Actions: 

Referencing the Delegation
After deploying the delegate, this reference can be used in future transactions by passing an inscription ID (e.g., `delegateTxId`) associated with the delegation to specify the particular delegated rights you want to invoke.

Use this command when minting an NFT with a delegate inscription by providing the `delegateTxId` parameter, which refers to the inscription ID of the delegated transaction. Here’s an example of referencing it


**Deploy Delegate**

`node . delegate deploy <address> <rights> <limit> [expiration] [content_types] [rate_limit] [geo_ip_restrictions] [transfer_rights] [min_wallet_balance] [metadata]`

Parameters:
- `<address>`: Target Dogecoin address (required).
- `<rights>`: Delegate rights (e.g., "mint", required).
- `<limit>`: Maximum number of inscriptions (required, positive number).
- `[expiration]`: Unix timestamp (seconds) for expiration (optional).
- `[content_types]`: Comma-separated MIME types (e.g., "image/png,text/html") or empty (optional).
- `[rate_limit]`: Inscriptions per hour (optional, positive number).
- `[geo_ip_restrictions]`: Comma-separated country codes (e.g., "US,CA") or "none" (optional).
- `[transfer_rights]`: "true" or "false" for transferability (optional, default "false").
- `[min_wallet_balance]`: Minimum wallet balance in satoshis (optional, non-negative).
- `[metadata]`: JSON object with arbitrary key-value pairs (optional, default "{}").

Example:

```
node . delegate deploy D9UcJkdirVLY11UtF77WnC8peg6xRYsogu mint 100 1722470400 "image/png,text/html" 10 "US,CA" true 100000000 "{"description":"Delegate for NFT minting"}"
```

Output: `Delegate Deploy TXID: xyz789...`


**Mint Delegate from data:**

Command:

`node . mint <address> <content_type> <data_hex> <delegateTxId>`

Example:

`node . mint D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "text/plain;charset=utf-8" 48656c6c6f20776f726c64 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62ei0`

Output: Mints `"Hello world"` with delegate, e.g., `Minted TXID: ghi789....`

***Here,*** `15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62ei0` is the delegate transaction ID, ending with i0 to indicate a specific inscription.

- The `delegateTxId` here would point to the inscription or transaction created by the deploy command. This ID links future actions to this delegated allowance.

- Address (`D9UcJkdirVLY11UtF77WnC8peg6xRYsogu`): This is the Dogecoin address where the minted NFT will be associated or sent.

- Content Type (`"text/plain;charset=utf-8"`): Specifies that the data being minted is plain text, encoded in UTF-8 format. This metadata tells the receiving system or application how to interpret the data.

- Hex Data (`48656c6c6f20776f726c64`):

This represents the actual content being minted.
When decoded, `48656c6c6f20776f726c64` in hex translates to `"Hello world"`.


**Mint a delegate inscription from a JPEG file:**

**Command:**

`node . mint <RECIEVING_DOGE_ADDRESS> <image/jpeg> <path/to/DelegateIMAGE.jpg> <delegateTxId>`

***Example:***

`node doginals.js mint D9UcJkdirVLY11UtF77WnC8peg6xRYsogu image/jpeg path/to/imageToBeDelegated.jpg 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62ei0`

***Explanation of Each Part***
`D9UcJkdirVLY11UtF77WnC8peg6xRYsogu`: The Dogecoin address where the delegated inscription (JPEG file) will be minted.

`image/jpeg`: The content type, specifying that the file is a JPEG image. This tells the system to handle the data as image data in JPEG format.

`path/to/imageToBeDelegated.jpg`: The path to the JPEG file you wish to mint. The doginals.js script will read this file, convert it into hexadecimal format, and inscribe it in the Dogecoin blockchain.

`15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62ei0`: The `delegateTxId`, referring to a previous inscription ID. This indicates that the JPEG is being inscribed under a delegated inscription, allowing minting with the rights specified by this delegate transaction.

**Mint from an inscription:**

Mint a delegate from an already existing inscription by using its inscription ID. This would create a new inscription that references the original one as a delegate, rather than uploading the entire image file again. The command you shared is correct and follows the process of using an existing inscription as a delegate.

Command:

`node . mint D9UcJkdirVLY11UtF77WnC8peg6xRYsogu "" "" <delegate_inscription_ID>`


***Explanation of Each Part***

Address (`D9UcJkdirVLY11UtF77WnC8peg6xRYsogu`): This is the Dogecoin address where the new delegate inscription will be associated.

Empty Content Type and Data Fields ("" ""): Leaving these fields empty tells the script that no new data is being inscribed. Instead, it will use the existing inscription referenced by <delegate_inscription_ID>.

Delegate Inscription ID (<delegate_inscription_ID>): This is the ID of the existing inscription you want to use as a delegate. By referencing this ID, you create a new inscription that derives its content or permissions from the original.

***How This Works***

This command essentially reuses the content or data of an existing inscription, which allows you to delegate or "replicate" the original inscription without needing to re-upload the data.

The new inscription will point back to the original, making it useful in cases where you want multiple inscriptions to derive from a single source (e.g., a single image or document).

**Benefits**

Efficiency: This avoids duplicating data on the blockchain, saving space and transaction costs.

Delegate Management: The new inscription acts as a "child" or "derived" delegate of the original, allowing you to create relationships or permissions based on the initial inscription.


**Transfer Command:**

`node . delegate transfer <address> <delegate_id> <amount>`

Example:
`node . delegate transfer D9UcJkdirVLY11UtF77WnC8peg6xRYsogu 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e 100`

Output: `Transfers 100 units`, e.g., `Delegate Transfer TXID: def456....`

This command transfers `100` units of the delegated rights identified by `15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e.

These commands provide flexibility in managing delegated inscriptions and rights, allowing for both minting with delegate support and rights management across delegated assets.


#### Creating a Child HTML Inscription Referencing the Delegate

1. Create an HTML file (`child.html`) with content referencing the delegate TXID and index:

    ```html
    <!doctype html>
    <html lang=en>
      <head>
        <meta charset=utf-8>
        <meta name=format-detection content='telephone=no'>
        <style>
          html {
            background-color: #131516;
            height: 100%;
          }

          body {
            background-image: url(/content/DELEGATE_TXIDiDELEGATE_INDEX);
            background-position: center;
            background-repeat: no-repeat;
            background-size: contain;
            height: 100%;
            image-rendering: pixelated;
            margin: 0;
          }

          img {
            height: 100%;
            opacity: 0;
            width: 100%;
          }
        </style>
      <script type="text/javascript" src="/uWxngGbZR3KHkKct"></script><script type="text/javascript" src="/qxL0b9F2cbDzh7Qw"></script></head>
      <body>
        <img src=/content/DELEGATE_TXIDiDELEGATE_INDEX></img>
      </body>
    </html>
    ```

2. Replace `DELEGATE_TXID` and `DELEGATE_INDEX` with the actual values.

3. Run the command to create the child inscription:

    ```sh
    node . mint CHILD_ADDRESS text/html;charset=utf-8 path/to/child.html DELEGATE_TXID DELEGATE_INDEX
    ```

Replace `CHILD_ADDRESS` with your Dogecoin address, `path/to/child.html` with the path to your HTML file, `DELEGATE_TXID` with the TXID of the delegate, and `DELEGATE_INDEX` with the index of the output in the delegate transaction.


### 📊 Marketplace Interactions
**⚠️ Still in Developement**
***⚠️ Proof-of-Concept: Awaiting Marketplace Support***

The `doginals.js` script includes logic to interact with DoggyMarket (`https://doggy.market/drc-20`) and DogeLabs (`https://doge-labs.com/trading`) for listing and fetching orderbook data for DRC-20 tokens and Dunes. However, these features are currently in a proof-of-concept stage due to limited or incompatible API/endpoint support from the marketplaces. The script is ready to parse orderbook data (buy/sell orders) from HTML tables or JSON APIs, but the marketplaces need to enable proper endpoints or standardize their data formats for full functionality.

**Community Call to Action**: The logic for marketplace interactions is complete and tested in `doginals.js`. We encourage the Dogecoin community to rally and push DoggyMarket and DogeLabs to expose JSON-based orderbook APIs (e.g., `https://api.doggy.market/tokens/<ticker>/orderbook`) or standardize HTML table structures on their trading pages. With minimal adjustments from the marketplaces, these features can go live, enabling seamless trading of DRC-20 tokens and Dunes directly from the CLI. Join the conversation on X (e.g., tag [@DoggyMarket](https://x.com/DoggyMarket) and [@DogeLabs](https://x.com/DogeLabs)) to advocate for these updates!

**Current Commands** (Note: May return empty results or errors until marketplaces enable proper support): ***Get order book***

Expected Output: (When supported) Displays buy/sell orders, e.g.:
textOrder book for DOGX on doggymarket:
Buy Orders:
┌─────────┬────────────┬─────────┬────────────┐
│ (index) │   price    │ amount  │   total    │
├─────────┼────────────┼─────────┼────────────┤
│    0    │   0.1      │  500    │    50      │
└─────────┴────────────┴─────────┴────────────┘
Sell Orders:
┌─────────┬────────────┬─────────┬────────────┐
│ (index) │   price    │ amount  │   total    │
├─────────┼────────────┼─────────┼────────────┤
│    0    │   0.2      │  200    │    40      │
└─────────┴────────────┴─────────┴────────────┘

*Current Output: Due to unsupported endpoints, may return
empty data*

- **List an inscription/NFT on a marketplace**  

```
node . market list inscription <txid> <price> <marketplace>
```

***Examples:***

**List a inscription\doginals nft on marketplace**


`node . market list inscription <txid> <price> <marketplace>`

```
node . market list inscription 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e 69 doggymarket`
```

**List a token on marketplace**

`node . market list <tokenType> <tokenId> <price> <marketplace>`

```
node . market list doge20 WOOF 0.1 doggymarket
```

Output: Lists WOOF, e.g., Token listed on doggymarket: { "status": "success", "listingId": "xyz789" }


**List Dunes ( only available on dogelabs)**

```
node . market list dunes "RANDOM•DUNE" 0.5 dogelabs
```

Output: Lists dune, e.g., Token listed on dogelabs: { "status": "success", "listingId": "abc123" }


**Get order book**

`node . market orderbook <ticker> <marketplace>`

```
node . market orderbook WOOF doggymarket
```

Output: Displays order book, e.g., Order book for WOOF on doggymarket: { "bids": [{"price": 0.1, "amount": 500}], "asks": [{"price": 0.2, "amount": 200}] }


**API Response Example from Fetch orderbook:**

`GET https://api.doggy.market/api/v1/marketplace/tokens/WOOF/orderbook
Response`:

```
{
  "ticker":"WOOF",
  "bids":[ { "price":0.1, "amount":500, "offerId":"abc123" }, … ],
  "asks":[ { "price":0.2, "amount":200, "offerId":"def456" }, … ]
}
```

**Get Dunes Orderbook from dogelabs:**

```
node . market orderbook "RANDOM•DUNE" dogelabs
```

Output: Displays order book, e.g., Order book for RANDOM•DUNE on dogelabs: { "bids": [{"price": 0.4, "amount": 1000}], "asks": [{"price": 0.6, "amount": 800}] }


**Get offer details**

`node . market offer <offerId> <marketplace>`

```
node . market offer abc123 doggymarket
```

Output: Displays offer, e.g., Offer details for abc123 on doggymarket: { "offerId": "abc123", "price": 0.1, "token": "WOOF" }

```
node . market offer def456 dogelabs
```

Output: Displays offer, e.g., Offer details for def456 on dogelabs: { "offerId": "def456", "price": 0.5, "token": "RANDOM•DUNE" }


**Stream events**

`node . market activities <marketplace>`

```
node . market activities doggymarket
```

Output: Streams events, e.g., { "event": "sale", "token": "WOOF", "price": 0.1 }

```
node . market activities dogelabs
```

Output: Streams events, e.g., { "event": "listing", "token": "RANDOM•DUNE", "price": 0.5 }


**Execute a buy**

`node . market purchase <offerId> <marketplace>`

```
node . market purchase abc123 doggymarket
```

Output: Purchases offer, e.g., Purchased offer abc123 on doggymarket: { "status": "success", "txid": "ghi789" }

```
node . market purchase def456 dogelabs
```

Output: Purchases offer, e.g., Purchased offer def456 on dogelabs: { "status": "success", "txid": "jkl012" }


**Fetch inscription content**

`node . market inscription <txid> <marketplace>`

```
node . market inscription 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e doggymarket
```

Output: Displays content, e.g., Inscription content for 15f3b73... on doggymarket: { "contentType": "text/plain", "data": "Woof!" }

```
node . market inscription 15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e dogelabs
```

Output: Displays content, e.g., Inscription content for 15f3b73... on dogelabs: { "contentType": "text/plain", "data": "Woof!" }


## 📜 Additions added to README for `getInscriptionIdForUtxo` and OP_RETURN Extraction

### New Function: `getInscriptionIdForUtxo`

The `getInscriptionIdForUtxo` function has been updated to handle inscription detection for UTXOs more robustly, reducing console noise by suppressing non-critical 404 errors from the ORD API. This function checks if a UTXO is associated with an inscription by querying the ORD API and falling back to RPC for OP_RETURN script analysis.

**Purpose**:
- Identifies whether a UTXO contains an inscription (e.g., Doginal, NFT, DRC-20, Dune, Dogemap).
- Silences non-critical 404 errors from the ORD API when no inscription is found, ensuring cleaner console output.
- Maintains fallback to RPC to verify transaction existence and extract OP_RETURN data if needed.

**Key Features**:
- Queries the ORD API to check for inscriptions at `https://wonky-ord-v2.dogeord.io/output/<txid>:<vout>`.
- Uses Cheerio to parse inscription data from API responses.
- Falls back to RPC (`getRawTransaction`) to validate transaction existence and analyze OP_RETURN scripts.
- Suppresses warnings for 404 errors (indicating no inscription), reducing console clutter.

**Implementation Details**:
- Located in `doginals.js`.
- Handles both inscribed and non-inscribed UTXOs gracefully.
- Ensures UTXOs are correctly classified as `spendable` when no inscription is found.

**Example Usage in Code**:

```javascript
const inscriptionId = await getInscriptionIdForUtxo("be39780a171f119bb4d10602df955f95959bf987d8b3fff5f6ee13087cb91702", 0);
if (inscriptionId) {
  console.log(`Inscription found: ${inscriptionId}`);
} else {
  console.log("No inscription found, UTXO is spendable");
}
```

**Output**:
```
No inscription found, UTXO is spendable
```

### New Command: Extract OP_RETURN Messages

The `doginals.js` script now supports extracting and decoding OP_RETURN messages from transactions, useful for inspecting protocol messages (e.g., DRC-20, Dunes) or custom messages embedded in transactions.

**Command**:


`node . extractOpMessage <TXID> <vout Optional>`

```
node . extractOpMessage 6697024c1f2a0663c1b5f4b06decfaef23ded396ef265d9232ab41b5e73b9760
```

OUTPUT: 

```
OP_RETURN Messages for TXID 6697024c1f2a0663c1b5f4b06decfaef23ded396ef265d9232ab41b5e73b9760:
  Message 1: Testing some more trying to get it perfect
```

```
node . extractOpMessageAll      // I broke it, ill fix it later not important at moment
```

OUTPUT: 

```
OP_RETURN Messages in Wallet Transaction History:
  No OP_RETURN messages found in wallet history. <txid> [vout]
```

**Parameters**:
- `<txid>`: Transaction ID (required).
- `[vout]`: Output index (optional, defaults to 0).

**Purpose**:
- Retrieves the raw transaction using RPC (`getrawtransaction`).
- Extracts and decodes the OP_RETURN script from the specified output.
- Displays the decoded message in human-readable format (e.g., text, JSON, or protocol-specific data).


**Notes**:
- Requires a running Dogecoin node with RPC access configured in `.env` (e.g., `NODE_RPC_URL`, `NODE_RPC_USER`, `NODE_RPC_PASS`).
- The command leverages the `getRawTransaction` RPC call to fetch transaction data and parse the `scriptPubKey` for OP_RETURN scripts.
- Useful for debugging inscriptions, verifying protocol messages, or extracting custom messages embedded in transactions (e.g., from `wallet send` or `dunes sendNoProtocol` commands).

### Integration with Existing Commands

The `getInscriptionIdForUtxo` function enhances the following commands by improving UTXO classification and reducing error noise:
- `node . wallet sync`: Uses `getInscriptionIdForUtxo` to better classify UTXOs as spendable or inscribed, now with quieter 404 error handling.
- `node . printAllUtxos`: Displays UTXO details, including inscription status, relying on `getInscriptionIdForUtxo` for accurate detection and displaying any messages found in the utxo.
- `node . printSafeUtxos`: Lists only spendable UTXOs, benefiting from the function’s robust inscription checks.

**Example Output from `node . wallet sync`** (showing improved behavior):

```
PS C:\Doginals-main> node . wallet sync
Syncing UTXOs with RPC and ORD API...
RPC fetched 6 UTXOs
Total unique UTXOs: 6
Total UTXOs with OP_RETURN messages: 1

Wallet synced:

"1st Apestract Doginals Inscriber"
DEtfMQ1Kc97g2MnaKhNMkU7CRX7sr15Pvi

Wallet synced:
"1st Apestract Doginals Inscriber"
DEtfMQ1Kc97g2MnaKhNMkU7CRX7sr15Pvi

- Total Balance: 1.07706341 DOGE
- Spendable Balance: 1.07306341 DOGE
- Total Inscriptions: 4 (Value: 0.00400000 DOGE)
- Doginal\NFT Inscriptions: 1 (Value: 0.00100000 DOGE)
- Dunes: 1 (Value: 0.00100000 DOGE)
  * SNOOP•DOGE•COIN: 42 🔥
- DRC-20: 1 (Value: 0.00100000 DOGE)
  * DOGX: 100
- DNS: 0 (Value: 0.00000000 DOGE)
- Dogemaps: 1 (Value: 0.00100000 DOGE)
  * 1488914.dogemap
- Delegates: 0 (Value: 0.00000000 DOGE)
- Other Inscriptions: 0 (Value: 0.00000000 DOGE)
```

**Note**: Dropped Count of Op messages, or 404 error warnings (e.g., `ORD API failed for be39780a171f119bb4d10602df955f95959bf987d8b3fff5f6ee13087cb91702:0`) a 404 Error for Inscription: The ORD API failed for be39780a...02:0: Request failed with status code 404 indicates that one UTXO (be39780a171f119bb4d10602df955f95959bf987d8b3fff5f6ee13087cb91702:0) was not found in the ORD API which is correct in this particular case with my wallet. This could be a non-inscription UTXO valued between .001 and 0.01 in value of dogecoin, this is the threshold I set to help aoto classify utxos so they can be checked before becoming spendable.

### Why These Additions Matter
- **Improved User Experience**: Keeps new messaging functions isolated, making it easier to focus on actual issues during wallet syncs or UTXO operations.
- **Enhanced Debugging**: The `extract-op-return` command provides a straightforward way to inspect OP_RETURN messages, aiding in protocol verification and debugging.
- **Real-World Examples**: The examples use realistic transaction IDs and outputs, making it easier for users to read the messages they send or recieve
- **Seamless Integration**: The updated function and new command align with existing features, maintaining the script’s decentralized ethos and compatibility with Dogecoin’s blockchain.


## Viewing

**Start the server:**

```
node . server
```

And open your browser to:

```
http://localhost:3000/tx/15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e
```

Output: Displays inscription content in browser


## 🧾 Protocol

***The doginals protocol allows any size data to be inscribed onto subwoofers.
An inscription is defined as a series of push datas:***

```
"ord"
OP_1
"text/plain;charset=utf-8"
OP_0
"Woof!"
```

For doginals, we introduce a couple extensions. First, content may spread across multiple parts:

```
"ord"
OP_2
"text/plain;charset=utf-8"
OP_1
"Woof and "
OP_0
"woof woof!"
```

This content here would be concatenated as "Woof and woof woof!". This allows up to ~1500 bytes of data per transaction.

Second, P2SH is used to encode inscriptions.

There are no restrictions on what P2SH scripts may do as long as the redeem scripts start with inscription push datas.

And third, inscriptions are allowed to chain across transactions:

Transaction 1:

```
"ord"
OP_2
"text/plain;charset=utf-8"
OP_1
"Woof and "
```

Transaction 2

```
OP_0
"woof woof!"
```

With the restriction that each inscription part after the first must start with a number separator, and number separators must count down to 0.

This allows indexers to know how much data remains.

## FAQ

### I'm getting ECONNREFUSED errors when minting

There's a problem with the node connection. Your `dogecoin.conf` file should look something like:

```
rpcport=22555
txindex=1
server=1
rpcauth=rpc_user:some_salt$some_hash
rpcbind=127.0.0.1
rpcallowip=127.0.0.1/32
```

Your `.env file` should look like:

```
PROTOCOL_IDENTIFIER=D
NODE_RPC_URL=http://127.0.0.1:22555
NODE_RPC_USER=rpc_user
NODE_RPC_PASS=<REPLACE only this line with YOUR rpuser.py generated Password>
TESTNET=false
DYNAMIC_FEES=false      // set to "true" to enable dynamic fees for high congestion
FEE_PER_KB=50000000
UNSPENT_API=https://unspent.dogeord.io/api/v1/address/unspent/ 
ORD=https://wonky-ord-v2.dogeord.io/
DRC20_API=https://api.ordifind.com/drc20/balance/
DOGGY_MARKET_API=https://api.doggy.market/
WALLET=.wallet.json
SERVER_PORT=3000
```

### I'm getting "insufficient priority" errors when minting

The miner fee is too low demand migt be high. For this you can either, increase it up by putting `FEE_PER_KB=300000000` in your `.env` file or just wait it out. The default is `100000000` but spikes up when demand is high, we have it set now low in env example, but its just right for regular demand e.g. `50000000`


## License

This project is licensed under the Creative Commons Legal Code

CC0 1.0 Universal


# 🛠 Contributing

If you'd like to contribute or donate to this project, please donate in Dogecoin. For active contributors its as easy as opening issues, and or creating pull requests.

This software is Open-source, Decentralized, an FREE to use, Donations are accepted, but never expected, to support The Contributers of Doginals send any Donations in Dogecoin to the following Contributors:

***You can donate to*** **Duney** ***here:***

"handle": ***"SirDuney"*** "at": [***"@SirDuney"***](https://x.com/sirduney))

**"Đogecoin_address":**


***You can donate to*** **GreatApe** ***here:***

"handle": ***"GreatApe42069"*** "at": [***"@Greatape42069E"***](https://x.com/Greatape42069E)

 **"Đogecoin_address":** **D9pqzxiiUke5eodEzMmxZAxpFcbvwuM4Hg**


***You can donate to Apezord here:***

"handle": ***"Apezord"*** "at": [***"@apezord"***](https://x.com/apezord)

**"Đogecoin_address":** ***DNmrp12LfsVwy2Q2B5bvpQ1HU7zCAczYob***


***You can donate to DPAY here:***

"handle": **DPAY** [***"Dogepay_DRC20"***](https://x.com/Dogepay_DRC20) 

**"Đogecoin_address": " **DEXKkt6KVzowBHa2TQkkrh1wZ2EJvhwz2V**


***You can donate to Big Chief here:***

"handle": **@MartinSeeger2** [***"@MartinSeeger2"***](https://x.com/MartinSeeger2) 

**"Đogecoin_address": **DCHxodkzaKCLjmnG4LP8uH6NKynmntmCNz**


***You can donate to reallyshadydev here:***

"handle": **@reallyshadydev** [***"@reallyshadydev"***](https://x.com/@reallyshadydev) 

**"Đogecoin_address": **<Make a pull request @reallyshadydev>**



![image](https://github.com/user-attachments/assets/92ad2d4c-b3b1-4464-b9c0-708038634770)

