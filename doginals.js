#!/usr/bin/env node
const dogecore = require("bitcore-lib-doge");
const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const cheerio = require("cheerio");
const dotenv = require("dotenv");
const mime = require("mime-types");
const express = require("express");
const prompts = require("prompts");
const JSON5 = require("json5");
const { PrivateKey, Address, Transaction, Script, Opcode } = dogecore;
const { Signature, Hash } = dogecore.crypto;
dotenv.config();
const fs = require("fs");
const RPC_URL = process.env.NODE_RPC_URL || "http://127.0.0.1:22555";
const RPC_AUTH = {
    username: process.env.NODE_RPC_USER || "rpc_user",
    password: process.env.NODE_RPC_PASS || "rpc_password"
};
axiosRetry(axios, { retries: 10, retryDelay: axiosRetry.exponentialDelay });
if (process.env.TESTNET === "true") {
  dogecore.Networks.defaultNetwork = dogecore.Networks.testnet;
}
const USE_DYNAMIC_FEES = process.env.DYNAMIC_FEES === "true";
Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB) || 100000000;
const WALLET_PATH = process.env.WALLET || ".wallet.json";
const DUST_THRESHOLD = 0.001 * 1e8;
const MAX_CHUNK_LEN = 520;
const MAX_PAYLOAD_LEN = 1500;
const ORD = process.env.ORD || "https://wonky-ord-v2.dogeord.io";
const DRC20_API = process.env.DRC20_API || "https://api.ordifind.com/drc20/balance";
const DOGGY_MARKET_API = process.env.DOGGY_MARKET_API || "https://api.doggy.market";
const ordApi = axios.create({ baseURL: ORD, timeout: 100000 });
const drc20Api = axios.create({ baseURL: DRC20_API, timeout: 100000 });
const doggyMarketApi = axios.create({ baseURL: DOGGY_MARKET_API, timeout: 100000, headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'} });
const STEPS = [
  0n, 26n, 702n, 18278n, 475254n, 12356630n, 321272406n, 8353082582n,
  217180147158n, 5646683826134n, 146813779479510n, 3817158266467286n,
  99246114928149462n, 2580398988131886038n, 67090373691429037014n,
  1744349715977154962390n, 45353092615406029022166n,
  1179180408000556754576342n, 30658690608014475618984918n,
  797125955808376366093607894n, 20725274851017785518433805270n,
  538857146126462423479278937046n, 14010285799288023010461252363222n,
  364267430781488598271992561443798n, 9470953200318703555071806597538774n,
  246244783208286292431866971536008150n, 6402364363415443603228541259936211926n,
  166461473448801533683942072758341510102n,
];
const SUBSIDY_HALVING_INTERVAL_10X = 2100000n;
const FIRST_DUNE_HEIGHT = 5084000n;
function minimumAtHeight(height) {
  const offset = BigInt(height) + 1n;
  const INTERVAL = SUBSIDY_HALVING_INTERVAL_10X / 12n;
  const start = FIRST_DUNE_HEIGHT;
  const end = start + SUBSIDY_HALVING_INTERVAL_10X;
  if (offset < start) return BigInt(STEPS[12]);
  if (offset >= end) return 0n;
  const progress = offset - start;
  const length = 12 - Math.floor(Number(progress / INTERVAL));
  const startValue = BigInt(STEPS[length]);
  const endValue = BigInt(STEPS[length - 1]);
  const remainder = progress % INTERVAL;
  return startValue - ((startValue - endValue) * remainder) / INTERVAL;
}
function stringToCharCodes(inputString) {
  const charCodes = [];
  for (let i = 0; i < inputString.length; i++) {
    charCodes.push(inputString.charCodeAt(i));
  }
  return charCodes;
}
const IDENTIFIER = stringToCharCodes(process.env.PROTOCOL_IDENTIFIER || "D");
const MAX_OP_RETURN_BYTES = 80;
const MARKETPLACES = {
  doggymarket: "https://doggy.market",
  dogelabs: "https://doge-labs.com",
};

// RPC Helper: Generic POST wrapper
async function rpcCall(method, params = []) {
  try {
    const res = await axios.post(RPC_URL, {
      jsonrpc: "1.0",
      id: "doginals",
      method,
      params,
    }, { auth: RPC_AUTH });
    if (res.data.error) {
      console.error(`RPC Error: ${JSON.stringify(res.data.error)}`);
      throw new Error(res.data.error.message);
    }
    return res.data.result;
  } catch (e) {
    console.error(`RPC ${method} failed: ${e.message}. Full error:`, e.response?.data);
    throw e;
  }
}

async function getRawTransaction(txid, verbose = 1, blockhash = null) {
  const params = blockhash ? [txid, verbose, blockhash] : [txid, verbose];
  return await rpcCall("getrawtransaction", params);
}

async function estimateSmartFee(confTarget = 6, estimateMode = "CONSERVATIVE") {
  try {
    const res = await rpcCall("estimatesmartfee", [confTarget, estimateMode]);
    if (res.feerate <= 0) throw new Error("Invalid fee estimate");
    return Math.ceil(res.feerate * 1e8); // DOGE/kB to sat/kB
  } catch (e) {
    console.warn(`estimatesmartfee failed: ${e.message}. Using default FEE_PER_KB.`);
    return parseInt(process.env.FEE_PER_KB) || 100000000;
  }
}

async function getBlockchainInfo() {
  return rpcCall("getblockchaininfo");
}

async function getMempoolInfo() {
  return rpcCall("getmempoolinfo");
}

async function getBalance(account = "", minconf = 1, includeWatchonly = false) {
  try {
    const balance = await rpcCall("getbalance", [account, minconf, includeWatchonly]);
    return balance * 1e8; // to satoshis
  } catch (e) {
    console.warn(`getbalance failed: ${e.message}. Returning 0.`);
    return 0;
  }
}

async function validateAddress(address) {
  return rpcCall("validateaddress", [address]);
}

async function getUnconfirmedBalance() {
  try {
    const balance = await rpcCall("getunconfirmedbalance");
    return balance * 1e8; // to satoshis
  } catch (e) {
    console.warn(`getunconfirmedbalance failed: ${e.message}. Returning 0.`);
    return 0;
  }
}

async function listUnspent(minconf = 0, maxconf = 9999999, addresses = [], includeUnsafe = true, queryOptions = {}) {
  try {
    const utxos = await rpcCall("listunspent", [minconf, maxconf, addresses, includeUnsafe, queryOptions]);
    return utxos.map(u => ({
      txid: u.txid,
      vout: u.vout,
      script: u.scriptPubKey,
      satoshis: Math.round(u.amount * 1e8),
      confirmations: u.confirmations || 0,
      type: "spendable" // Default; classify further if needed
    }));
  } catch (e) {
    console.warn(`listunspent failed: ${e.message}. Falling back to ORD API.`);
    return await fetchAllUnspentOutputs(addresses[0]);
  }
}

async function listTransactions(account = "*", count = 10000, skip = 0, includeWatchonly = true) {
  try {
    return await rpcCall("listtransactions", [account, count, skip, includeWatchonly]);
  } catch (e) {
    console.warn(`listtransactions failed: ${e.message}. Returning empty list.`);
    return [];
  }
}

async function extractOpMessageAll() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  // Fetch all transactions for the wallet address
  const transactions = await listTransactions(wallet.address, 10000, 0, true);
  const txids = transactions.map(tx => tx.txid);
  const txMessages = await getTxOpReturnMessages(txids);
  let messageCount = 0;
  console.log("OP_RETURN Messages in Wallet Transaction History:");
  for (const txid of txids) {
    const messages = txMessages.get(txid);
    if (messages && messages.length > 0) {
      console.log(`  TXID: ${txid}`);
      messages.forEach((msg, i) => {
        console.log(`    Message ${i + 1}: ${msg}`);
      });
      messageCount += messages.length;
    }
  }
  if (messageCount === 0) {
    console.log("  No OP_RETURN messages found in wallet history.");
  } else {
    console.log(`Total OP_RETURN messages found: ${messageCount}`);
  }
}
async function getMempoolEntry(txid) {
  try {
    return await rpcCall("getmempoolentry", [txid]);
  } catch (e) {
    console.warn(`getmempoolentry failed for ${txid}: ${e.message}. Returning null.`);
    return null;
  }
}

function safeJsonParse(buf) {
  try {
    return JSON5.parse(buf.toString("utf-8"));
  } catch (e) {
    return null;
  }
}
// Improved detectMimeType
function detectMimeType(buffer, filename = "", apiContentType = null) {
  if (apiContentType) return apiContentType;
  const content = buffer.toString("utf-8").trim();
  // JSON-based inscriptions
  try {
    const json = JSON.parse(content);
    if (json.p === "drc-20" || json.p === "drct") return "application/drc20";
    if (json.p === "dogemaps") return "application/dogemap";
    if (json.p === "dns") return "application/dns";
    if (json.p === "delegate") return "application/delegate";
  } catch {}
  // Dogemap patterns
  if (filename.match(/\.dogemap$/i) || content.match(/\.dogemap$/)) return "application/dogemap";
  // Image detection for NFTs
  if (buffer.slice(0, 2).equals(Buffer.from([0xff, 0xd8]))) return "image/jpeg";
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return "application/octet-stream"; // Default
}
async function getInscriptionIdForUtxo(txid, vout) {
  // Try ORD API first for inscription detection
  try {
    const res = await ordApi.get(`/output/${txid}:${vout}`);
    const $ = cheerio.load(res.data);
    const inscriptionSection = $('dt:contains("inscriptions")').next('dd');
    const inscriptionLink = inscriptionSection.find('a').attr('href');
    if (inscriptionLink) {
      const match = inscriptionLink.match(/\/(shibescription|inscription)\/(.+)$/);
      if (match) return match[2];
    }
    // If no inscription, validate TX existence with RPC
    await getRawTransaction(txid, true);
    return null; // No inscription found
  } catch (e) {
    // Suppress warning for 404 errors (no inscription found)
    if (e.response?.status !== 404) {
      console.warn(`ORD API failed for ${txid}:${vout}: ${e.message}`);
    }
    // Fallback to RPC for OP_RETURN check
    try {
      const rawTx = await getRawTransaction(txid, true);
      if (rawTx.vout[vout]) {
        const scriptHex = rawTx.vout[vout].scriptPubKey.hex;
        const script = new Script(scriptHex);
        if (script.isDataOut()) {
          const inscription = await extract(txid, vout, false);
          if (inscription?.contentType?.startsWith("application/")) {
            return `${txid}i${vout}`;
          }
        }
      }
      return null;
    } catch (rpcErr) {
      console.warn(`RPC fallback failed for ${txid}:${vout}: ${rpcErr.message}`);
      return null;
    }
  }
}
async function getInscriptionDetails(inscriptionId) {
  // Try ORD API first for inscription metadata
  try {
    const res = await ordApi.get(`/inscription/${inscriptionId}`);
    const $ = cheerio.load(res.data);
    const details = {};
    $("dl dt").each((_, el) => {
      const label = $(el).text().trim();
      const dd = $(el).next("dd");
      const value = dd.text().trim();
      if (label === "content type") details.contentType = value;
      if (label === "content length") details.contentLength = parseInt(value.replace(' bytes', ''), 10);
      if (label === "id") details.id = value;
      if (label === "timestamp") details.inscribedAt = dd.find('time').text();
      if (label === "genesis height") details.blockHeight = parseInt(dd.text(), 10);
      if (label === "genesis fee") details.genesisFee = parseInt(value, 10);
      if (label === "genesis transaction") details.genesisTx = dd.text();
      if (label === "location") details.location = value;
      if (label === "output") details.output = dd.text();
      if (label === "offset") details.offset = parseInt(value, 10);
      if (label === "output value") details.outputValue = parseInt(value, 10);
      if (label === "address") details.owner = value;
    });
    details.inscriptionNumber = $('h1').text().match(/Shibescription (\d+)/)?.[1] || null;
    // Enhance with RPC for inscribedBy and confirmation data
    try {
      const raw = await getRawTransaction(details.genesisTx, true);
      const vin = raw.vin[0];
      const prevTx = await getRawTransaction(vin.txid, true);
      const prevOutput = prevTx.vout[vin.vout];
      details.inscribedBy = Script.fromHex(prevOutput.scriptPubKey.hex).toAddress().toString();
      if (raw.confirmations) {
        details.blockHeight = (await getBlockCount()) - raw.confirmations;
        details.inscribedAt = raw.time ? new Date(raw.time * 1000).toISOString() : details.inscribedAt;
      }
    } catch (rpcErr) {
      console.warn(`RPC enhancement failed for ${inscriptionId}: ${rpcErr.message}`);
    }
    details.listed = false;
    details.txs = [details.genesisTx];
    return details;
  } catch (e) {
    console.warn(`ORD API failed for ${inscriptionId}: ${e.message}`);
    // Fallback to RPC for basic transaction details
    try {
      const [txid, vout] = inscriptionId.split("i");
      const raw = await getRawTransaction(txid, true);
      const output = raw.vout[parseInt(vout)];
      const inscription = await extract(txid, parseInt(vout), false);
      const details = {
        contentType: inscription?.contentType || "application/octet-stream",
        contentLength: inscription?.data.length || 0,
        id: inscriptionId,
        genesisTx: txid,
        output: `${txid}:${vout}`,
        outputValue: Math.round(output.value * 1e8),
        owner: output.scriptPubKey.addresses?.[0] || null,
        offset: 0,
        blockHeight: raw.confirmations ? await getBlockCount() - raw.confirmations : null,
        inscribedAt: raw.time ? new Date(raw.time * 1000).toISOString() : null,
        genesisFee: null,
        location: `${txid}:${vout}:0`,
        inscriptionNumber: null,
        listed: false,
        txs: [txid]
      };
      const vin = raw.vin[0];
      const prevTx = await getRawTransaction(vin.txid, true);
      const prevOutput = prevTx.vout[vin.vout];
      details.inscribedBy = Script.fromHex(prevOutput.scriptPubKey.hex).toAddress().toString();
      return details;
    } catch (rpcErr) {
      console.warn(`RPC fallback failed for ${inscriptionId}: ${rpcErr.message}`);
      return null;
    }
  }
}
async function getTransferEvents(txid) {
  // Try RPC for transfer data
  try {
    const raw = await getRawTransaction(txid, true);
    const events = [];
    for (const vout of raw.vout) {
      if (vout.scriptPubKey.type === "nulldata") {
        const script = Script.fromHex(vout.scriptPubKey.hex);
        const data = safeJsonParse(Buffer.concat(script.chunks.slice(1).map(c => c.buf || Buffer.alloc(0))));
        if (data?.p === "drc-20" || data?.p === "drct") {
          events.push({
            type: data.op,
            tick: data.tick?.toUpperCase(),
            amount: data.amt || data.at,
            from: raw.vin[0] ? (await getRawTransaction(raw.vin[0].txid, true)).vout[raw.vin[0].vout].scriptPubKey.addresses?.[0] : null,
            to: vout.scriptPubKey.addresses?.[0] || null,
            inscriptionId: `${txid}i${vout.n}`,
          });
        }
      }
    }
    if (events.length > 0) return events;
  } catch (e) {
    console.warn(`RPC getTransferEvents failed for ${txid}: ${e.message}`);
  }
  // Fallback to ORD API
  try {
    const res = await ordApi.get(`/tx/${txid}`);
    const $ = cheerio.load(res.data);
    const events = [];
    $("h2:contains('Drc20 Event'), h2:contains('Inscription Event')").each((_, h2) => {
      const table = $(h2).next("table");
      const event = {};
      table.find("tr").each((_, tr) => {
        const key = $(tr).find("th").text().trim();
        const value = $(tr).find("td").text().trim();
        if (key === "Event") event.type = value;
        else if (key === "Tick") event.tick = value;
        else if (key === "amount") event.amount = value;
        else if (key === "from") event.from = value;
        else if (key === "to") event.to = value;
        else if (key === "Inscription ID") event.inscriptionId = value;
      });
      if (Object.keys(event).length > 1) events.push(event);
    });
    return events;
  } catch (e) {
    console.warn(`Failed to fetch transfer events for TX ${txid}: ${e.message}`);
    return [];
  }
}
async function classifyInscription(inscription, txid, vout, walletAddress) {
  if (!inscription || !inscription.contentType) {
    console.warn(`No content type for TXID ${txid}:${vout}, defaulting to inscription`);
    return "inscription";
  }
  const contentType = inscription.contentType.toLowerCase();
  let dataString;
  try {
    dataString = inscription.data.toString("utf-8").trim();
  } catch (e) {
    console.warn(`Failed to decode data for TXID ${txid}:${vout}: ${e.message}. Defaulting to inscription.`);
    return "inscription";
  }
  // Check for Dunes via ORD API
  if (contentType === "application/dune" || await isDune(`${txid}:${vout}`)) {
    return "dunes";
  }
  // Text/plain for DRC-20 or Dogemap
  if (contentType.includes("text/plain")) {
    if (dataString.startsWith('{"p":"drc-20"') || dataString.startsWith('{"p":"drct"')) {
      return "doge20";
    }
    if (dataString.match(/\.dogemap$/i)) {
      return "dogemaps";
    }
  }
  // JSON-based inscriptions
  if (contentType === "application/json") {
    try {
      const parsed = JSON.parse(dataString);
      if (parsed?.p === "drc-20" || parsed?.p === "drct") return "doge20";
      if (parsed?.p === "dogemaps" || dataString.match(/\.dogemap$/i)) return "dogemaps";
      if (parsed?.p === "dns") return "dns";
      if (parsed?.p === "delegate") return "delegate";
    } catch (e) {
      console.warn(`Failed to parse JSON for TXID ${txid}:${vout}: ${e.message}`);
    }
  }
  // NFT detection
  if (contentType.startsWith("image/") || contentType.startsWith("audio/") || contentType.startsWith("video/") || contentType === "application/nft") {
    return "nft";
  }
  // Dogemap detection (fallback)
  if (contentType === "application/dogemap" || dataString.match(/\.dogemap$/i)) {
    return "dogemaps";
  }
  // RPC check for OP_RETURN scripts as a last resort
  try {
    const raw = await getRawTransaction(txid, true);
    const script = Script.fromHex(raw.vout[vout].scriptPubKey.hex);
    if (script.isNullData() && dataString.includes("D")) {
      return "dunes";
    }
  } catch (e) {
    console.warn(`RPC classifyInscription for Dunes failed: ${e.message}`);
  }
  console.warn(`Unclassified inscription for TXID ${txid}:${vout}, contentType: ${contentType}`);
  return "inscription";
}
class PushBytes {
  constructor(bytes) {
    this.bytes = Buffer.from(bytes);
  }
  static fromSliceUnchecked(bytes) {
    return new PushBytes(bytes);
  }
  static empty() {
    return new PushBytes([]);
  }
  asBytes() {
    return this.bytes;
  }
}
function varIntEncode(n) {
  const out = new Array(19).fill(0);
  let i = 18;
  out[i] = Number(BigInt(n) & 0b01111111n);
  while (BigInt(n) > 0b01111111n) {
    n = BigInt(n) / 128n - 1n;
    i -= 1;
    out[i] = Number(BigInt(n) | 0b10000000n);
  }
  return out.slice(i);
}
class Tag {
  static Body = 0;
  static Flags = 2;
  static Dune = 4;
  static Limit = 6;
  static OffsetEnd = 8;
  static Deadline = 10;
  static Pointer = 12;
  static HeightStart = 14;
  static OffsetStart = 16;
  static HeightEnd = 18;
  static Cap = 20;
  static Premine = 22;
  static Cenotaph = 254;
  static Divisibility = 1;
  static Spacers = 3;
  static Symbol = 5;
  static Nop = 255;
  static subv(n) {
    const out = [];
    out.push(Number(n & 0b01111111n));
    while (n > 0b01111111n) {
      n = n / 128n - 1n;
      out.unshift(Number((n & 0b01111111n) | 0b10000000n));
    }
    return out;
  }
  static encode(tag, value, payload) {
    payload.push(varIntEncode(tag));
    if (tag === Tag.Dune) payload.push(Tag.subv(value));
    else if (typeof value === "string") payload.push(Buffer.from(value, "utf8"));
    else payload.push(varIntEncode(value));
  }
}
class Flag {
  static Etch = 0;
  static Terms = 1;
  static Turbo = 2;
  static mask(flag) {
    return BigInt(1) << BigInt(flag);
  }
}
function constructScript(etching = null, pointer = undefined, cenotaph = null, edicts = []) {
  const payload = [];
  if (etching) {
    let flags = Number(Flag.mask(Flag.Etch));
    if (etching.turbo) flags |= Number(Flag.mask(Flag.Turbo));
    if (etching.terms) flags |= Number(Flag.mask(Flag.Terms));
    Tag.encode(Tag.Flags, flags, payload);
    if (etching.dune) Tag.encode(Tag.Dune, etching.dune, payload);
    if (etching.terms) {
      if (etching.terms.limit) Tag.encode(Tag.Limit, etching.terms.limit, payload);
      if (etching.terms.cap) Tag.encode(Tag.Cap, etching.terms.cap, payload);
      if (etching.terms.offsetStart) Tag.encode(Tag.OffsetStart, etching.terms.offsetStart, payload);
      if (etching.terms.offsetEnd) Tag.encode(Tag.OffsetEnd, etching.terms.offsetEnd, payload);
      if (etching.terms.heightStart) Tag.encode(Tag.HeightStart, etching.terms.heightStart, payload);
      if (etching.terms.heightEnd) Tag.encode(Tag.HeightEnd, etching.terms.heightEnd, payload);
      if (etching.terms.price) {
        Tag.encode(Tag.PriceAmount, etching.terms.price.amount, payload);
        Tag.encode(Tag.PricePayTo, Buffer.from(etching.terms.price.pay_to, "utf8"), payload);
      }
    }
    if (etching.divisibility !== 0) Tag.encode(Tag.Divisibility, etching.divisibility, payload);
    if (etching.spacers !== 0) Tag.encode(Tag.Spacers, etching.spacers, payload);
    if (etching.symbol) Tag.encode(Tag.Symbol, etching.symbol, payload);
    if (etching.premine) Tag.encode(Tag.Premine, etching.premine, payload);
  }
  if (pointer !== undefined) Tag.encode(Tag.Pointer, pointer, payload);
  if (cenotaph) Tag.encode(Tag.Cenotaph, 0, payload);
  if (edicts && edicts.length > 0) {
    payload.push(varIntEncode(Tag.Body));
    const sortedEdicts = edicts.slice().sort((a, b) => Number(a.id - b.id));
    let lastId = 0n;
    for (const edict of sortedEdicts) {
      payload.push(varIntEncode(edict.id - lastId));
      payload.push(varIntEncode(edict.amount));
      payload.push(varIntEncode(edict.output));
      lastId = edict.id;
    }
  }
  const script = new Script().add("OP_RETURN");
  IDENTIFIER.forEach((code) => script.add(Buffer.from([code])));
  const flattened = payload.flat();
  for (let i = 0; i < flattened.length; i += MAX_CHUNK_LEN) {
    const chunk = flattened.slice(i, i + MAX_CHUNK_LEN);
    script.add(Buffer.from(PushBytes.fromSliceUnchecked(chunk).asBytes()));
  }
  return script;
}
class SpacedDune {
  constructor(dune, spacers) {
    this.dune = parseDuneFromString(dune);
    this.spacers = spacers;
  }
}
class Dune {
  constructor(value) {
    this.value = BigInt(value);
  }
}
function parseDuneFromString(s) {
  let x = 0n;
  for (let i = 0; i < s.length; i++) {
    if (i > 0) x += 1n;
    x *= 26n;
    const c = s.charCodeAt(i);
    if (c >= 65 && c <= 90) x += BigInt(c - 65);
    else throw new Error(`Invalid character in dune name: ${s[i]}`);
  }
  return new Dune(x);
}
function spacedDunefromStr(s) {
  let dune = "";
  let spacers = 0;
  for (const c of s) {
    if (/[A-Z]/.test(c)) dune += c;
    else if (/[\u2022\u2023]/.test(c)) {
      const flag = 1 << (dune.length - 1);
      if ((spacers & flag) !== 0) throw new Error("double spacer");
      spacers |= flag;
    } else throw new Error("invalid character");
  }
  if (32 - Math.clz32(spacers) >= dune.length) throw new Error("trailing spacer");
  return new SpacedDune(dune, spacers);
}
class Edict {
  constructor(id, amount, output) {
    this.id = BigInt(id);
    this.amount = BigInt(amount);
    this.output = output;
  }
}
class Terms {
  constructor(limit, cap, offsetStart, offsetEnd, heightStart, heightEnd, price = null) {
    this.limit = limit !== undefined ? BigInt(limit) : null;
    this.cap = cap !== undefined ? BigInt(cap) : null;
    this.offsetStart = offsetStart !== undefined ? BigInt(offsetStart) : null;
    this.offsetEnd = offsetEnd !== undefined ? BigInt(offsetEnd) : null;
    this.heightStart = heightStart !== undefined ? BigInt(heightStart) : null;
    this.heightEnd = heightEnd !== undefined ? BigInt(heightEnd) : null;
    if (price) this.price = price;
  }
}
class Etching {
  constructor(divisibility, terms, turbo, premine, dune, spacers, symbol) {
    this.divisibility = parseInt(divisibility);
    this.terms = terms;
    this.turbo = turbo;
    this.premine = premine ? BigInt(premine) : null;
    this.dune = dune;
    this.spacers = spacers;
    this.symbol = symbol ? symbol.codePointAt(0) : null;
  }
}
function encodeToTuple(n) {
  const tuple = [];
  tuple.push(Number(n & 0b01111111n));
  while (n > 0b01111111n) {
    n = n / 128n - 1n;
    tuple.unshift(Number((n & 0b01111111n) | 0b10000000n));
  }
  return tuple;
}
function bufferToChunk(b) {
  b = Buffer.from(b);
  return { buf: b.length ? b : undefined, len: b.length, opcodenum: b.length <= 75 ? b.length : b.length <= 255 ? 76 : 77 };
}
function numberToChunk(n) {
  return { buf: n <= 16 ? undefined : n < 128 ? Buffer.from([n]) : Buffer.from([n % 256, Math.floor(n / 256)]), len: n <= 16 ? 0 : n < 128 ? 1 : 2, opcodenum: n === 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2 };
}
function opcodeToChunk(op) {
  return { opcodenum: op };
}
function IdToChunk(inscription_id) {
  if (!inscription_id.endsWith("i0")) throw new Error("Provide inscription ID ending with 'i0'");
  const txid = inscription_id.slice(0, -2);
  return { buf: Buffer.from(txid, "hex").reverse(), len: 32, opcodenum: 32 };
}
async function getMempoolMetrics() {
  try {
    const mempool = await getMempoolInfo();
    const txCount = mempool.size;
    const bytes = mempool.bytes;
    const maxMempool = mempool["maxmempool"];
    const mempoolMinFee = mempool.mempoolminfee * 1e8; // to sat/kB
    // Fetch some entries to estimate avg fee rate
    const rawMempool = await rpcCall("getrawmempool", [true]);
    let totalFee = 0;
    let totalVsize = 0;
    let count = 0;
    for (const [txid, entry] of Object.entries(rawMempool).slice(0, 100)) {
      totalFee += entry.fee * 1e8; // to satoshis
      totalVsize += entry.vsize;
      count++;
    }
    const avgFeeRate = count > 0 ? (totalFee / totalVsize) : mempoolMinFee;
    return { txCount, chains: Object.values(rawMempool).filter(tx => tx.depends?.length > 0).length, avgFeeRate: Number(avgFeeRate.toFixed(2)), bytes, maxMempool };
  } catch (e) {
    console.warn(`Failed to fetch mempool metrics: ${e.message}`);
    if (fs.existsSync("mempool.json")) {
      const mempool = JSON.parse(fs.readFileSync("mempool.json"));
      const txCount = Object.keys(mempool).length;
      const chains = Object.values(mempool).filter((tx) => tx.depends.length > 0).length;
      const avgFeeRate = Object.values(mempool).reduce((acc, tx) => acc + (tx.fee / tx.size), 0) / txCount;
      return { txCount, chains, avgFeeRate: Number(avgFeeRate.toFixed(2)) };
    }
    return null;
  }
}
async function main() {
  const cmd = process.argv[2];

  // Handle pending transactions rebroadcast
  if (fs.existsSync("pending-txs.json")) {
    console.log("Found pending-txs.json. Rebroadcasting...");
    const txs = JSON.parse(fs.readFileSync("pending-txs.json"));
    for (const raw of txs) {
      const tx = new Transaction(raw);
      try {
        await broadcast(tx, false);
      } catch (e) {
        console.warn(`Retry failed: ${tx.hash}. Will retry again later.`);
      }
    }
    return;
  }

  // Early returns for specific commands
  if (cmd === "rebuild-wallet") return await rebuildWallet();
  if (cmd === "show-pending") return await showPending();
  if (cmd === "printAllUtxos") return await printAllUtxos();

  // Switch for all other commands
  switch (cmd) {
    case "wallet":
      return await handleWallet();
    case "mint":
      return await mint();
    case "doge20":
      return await doge20();
    case "server":
      return server();
    case "dns":
      return await handleDNS();
    case "dunes":
      return await handleDunes();
    case "market":
      return await handleMarket();
    case "printDunes":
      return await printDunes();
    case "printDuneBalance":
      return await printDuneBalance();
    case "printSafeUtxos":
      return await printSafeUtxos();
    case "decodeDunesScript":
      return await decodeDunesScript(process.argv[3]);
    case "rebuild_wallet":
      return await rebuildWallet();
    case "index-mempool":
      return await indexMempoolAndPending();
    case "delegate":
      return await handleDelegate();
    case "extractOpMessage":
      if (process.argv.length < 4) {
        console.error("Usage: node . extractOpMessage <txid>");
        process.exit(1);
      }
      const txid = process.argv[3];
      await extractOpMessage(txid);
      break;
    case "extractOpMessageAll":
      await extractOpMessageAll();
      break;
    default:
      console.error(`Unknown command: ${cmd}
You must run each command using: node . <command> [...args]
Available commands:
  Wallet:
    wallet new                   Create a new wallet
    wallet sync                  Sync with chain + ord
    wallet balance               Show wallet balances
    wallet split <count> [amount_per_split] Split balance into equal UTXOs only using spendable UTXOs
    wallet send <addr> <amt> [msg] Send DOGE to address (optional OP_RETURN)
    wallet sendutxo <txid> <vout> <addr> [msg] Send specific UTXO with optional message
  Minting:
    mint <addr> <type|file> <hex> [delegate] [msg] Mint content to Doginals
    inscribe                     Internal function used for minting logic
  DNS:
    dnsDeploy <ns> [about] [avatar] Deploy a new DNS namespace
    dnsReg <name> [avatar] [rev] [relay] Register a DNS name with optional metadata
  Dunes:
    printDunes                   Print all Dunes from wallet
    printDuneBalance <name> [address] Check balance of a specific Dune token
    decodeDunesScript <script>   Decode OP_RETURN Dunes script
  UTXO Management:
    printAllUtxos                Show all wallet UTXOs
    printSafeUtxos               List only safe/spendable UTXOs
    show-pending                 Display UTXOs pending in mempool
    rebuild-wallet               Rebuild wallet from scratch
    index-mempool                Manually trigger mempool indexing
  OP_RETURN Messages:
    extractOpMessage <txid>      Extract OP_RETURN messages from a specific TXID
    extractOpMessageAll          Extract all OP_RETURN messages from wallet transaction history
  Misc:
    delegate                     Handle delegation-related operations
    doge20                       DRC-20 explorer/manager
    dogemaps [future]            Handle Dogemap entries
    market                       Marketplace interface (if implemented)
    server                       Launch optional REST/Explorer server
Deploy a delegate inscription example (see readme for more details):
  delegate deploy <address> <rights> <limit> [expiration] [content_types] [rate_limit] [geo_ip_restrictions] [transfer_rights] [min_wallet_balance] [metadata]
  delegate transfer <address> <delegateId> <amount> Transfer delegate rights
`);
      process.exit(1);
  }
}
async function rebuildWallet() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  console.log("🔄 Rebuilding wallet...");
  const txids = wallet.utxos.map((u) => u.txid);
  const checked = [];
  for (const txid of txids) {
    try {
      const raw = await axios.post(RPC_URL, {
        jsonrpc: "1.0", id: "doginals", method: "getrawtransaction", params: [txid, true]
      }, { auth: RPC_AUTH });
      if (!raw.data.result.confirmations) {
        console.log(` - TX ${txid} missing or unconfirmed`);
      } else {
        checked.push(txid);
      }
    } catch {
      console.warn(` - TX ${txid} not found. Removing.`);
    }
  }
  wallet.utxos = wallet.utxos.filter((u) => checked.includes(u.txid));
  fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
  console.log("🔍 Re-classifying UTXOs...");
  await walletBalance();
  console.log("✅ Rebuild complete.");
}
async function handleDelegate() {
  const subcmd = process.argv[3];
  switch (subcmd) {
    case "deploy":
      return await delegateDeploy();
    case "transfer":
      return await delegateTransfer();
    default:
      throw new Error(`Unknown delegate subcommand: ${subcmd}`);
  }
}
async function delegateDeploy() {
  const address = process.argv[4];
  const rights = process.argv[5];
  const limit = process.argv[6];
  const expiration = process.argv[7] || null;
  const content_types = process.argv[8] || "";
  const rate_limit = process.argv[9] || null;
  const geo_ip_restrictions = process.argv[10] || "none";
  const transfer_rights = process.argv[11] || "false";
  const min_wallet_balance = process.argv[12] || null;
  const metadata = process.argv[13] || "{}";
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  try {
    if (!Address.isValid(address)) throw new Error("Invalid address");
    if (!rights || typeof rights !== "string") throw new Error("Rights must be a non-empty string");
    if (!limit || isNaN(limit) || Number(limit) <= 0) throw new Error("Limit must be a positive number");
    if (expiration && (isNaN(expiration) || Number(expiration) <= 0)) {
      throw new Error("Expiration must be a positive Unix timestamp (seconds)");
    }
    if (content_types) {
      const types = content_types.split(",");
      if (!types.every((t) => mime.lookup(t) || t === "application/dogemap")) {
        throw new Error("Content types must be valid MIME types or 'application/dogemap'");
      }
    }
    if (rate_limit && (isNaN(rate_limit) || Number(rate_limit) <= 0)) {
      throw new Error("Rate limit must be a positive number");
    }
    if (geo_ip_restrictions !== "none") {
      const countries = geo_ip_restrictions.split(",");
      if (!countries.every((c) => /^[A-Z]{2}$/.test(c))) {
        throw new Error("Geo IP restrictions must be comma-separated 2-letter country codes or 'none'");
      }
    }
    if (!["true", "false"].includes(transfer_rights)) {
      throw new Error("Transfer rights must be 'true' or 'false'");
    }
    if (min_wallet_balance && (isNaN(min_wallet_balance) || Number(min_wallet_balance) < 0)) {
      throw new Error("Minimum wallet balance must be a non-negative number (in satoshis)");
    }
    let parsedMetadata;
    try {
      parsedMetadata = JSON5.parse(metadata);
      if (typeof parsedMetadata !== "object" || Array.isArray(parsedMetadata)) {
        throw new Error("Metadata must be a JSON object");
      }
    } catch (e) {
      throw new Error(`Invalid metadata JSON: ${e.message}`);
    }
    const delegatePayload = {
      p: "delegate",
      op: "deploy",
      rights,
      limit,
      meta: {
        ...(expiration && { expiration: Number(expiration) }),
        ...(content_types && { content_types: content_types.split(",") }),
        ...(rate_limit && { rate_limit: Number(rate_limit) }),
        ...(geo_ip_restrictions !== "none" && { geo_ip_restrictions: geo_ip_restrictions.split(",") }),
        transfer_rights: transfer_rights === "true",
        ...(min_wallet_balance && { min_wallet_balance: Number(min_wallet_balance) }),
        metadata: parsedMetadata,
        timestamp: Math.floor(Date.now() / 1000),
      },
    };
    const data = Buffer.from(JSON5.stringify(delegatePayload), "utf8");
    if (data.length > MAX_PAYLOAD_LEN) {
      throw new Error(`Delegate payload exceeds ${MAX_PAYLOAD_LEN}-byte limit`);
    }
    const txs = inscribe(wallet, new Address(address), "application/json", data);
    await broadcastAll(txs, wallet);
    console.log("Delegate Deploy TXID:", txs[txs.length - 1].hash);
  } catch (e) {
    console.error(`Validation error: ${e.message}`);
    process.exit(1);
  }
}
async function delegateTransfer() {
  const address = process.argv[4];
  const delegateId = process.argv[5];
  const amount = process.argv[6];
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  try {
    if (!Address.isValid(address)) throw new Error("Invalid address");
    if (!delegateId || !delegateId.match(/^[a-f0-9]{64}$/)) throw new Error("Delegate ID must be a 64-character hex string");
    if (!amount || isNaN(amount) || Number(amount) <= 0) throw new Error("Amount must be a positive number");
    const delegatePayload = await fetchDelegateMetadata(delegateId);
    const meta = delegatePayload.meta || {};
    if (meta.transfer_rights === false) {
      throw new Error("Delegate rights cannot be transferred");
    }
    const data = JSON5.stringify({ p: "delegate", op: "transfer", delegateId, amount });
    const txs = inscribe(wallet, new Address(address), "application/json", Buffer.from(data));
    await broadcastAll(txs, wallet);
    console.log("Delegate Transfer TXID:", txs[txs.length - 1].hash);
  } catch (e) {
    console.error(`Validation error: ${e.message}`);
    process.exit(1);
  }
}
async function fetchDelegateMetadata(delegateTxId) {
  try {
    const inscription = await extract(delegateTxId, 0, false);
    if (!inscription || inscription.contentType !== "application/json") {
      throw new Error("Invalid delegate inscription: must be application/json");
    }
    const payload = safeJsonParse(inscription.data);
    if (!payload || payload.p !== "delegate" || payload.op !== "deploy") {
      throw new Error("Invalid delegate inscription: must have p: 'delegate' and op: 'deploy'");
    }
    return payload;
  } catch (e) {
    throw new Error(`Failed to fetch delegate metadata: ${e.message}`);
  }
}
const RATE_LIMIT_CACHE_PATH = "./delegate_rate_limit.json";
function loadRateLimitCache() {
  try {
    if (fs.existsSync(RATE_LIMIT_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(RATE_LIMIT_CACHE_PATH));
    }
    return {};
  } catch (e) {
    console.warn(`Warning: Failed to load rate limit cache: ${e.message}`);
    return {};
  }
}
function saveRateLimitCache(cache) {
  fs.writeFileSync(RATE_LIMIT_CACHE_PATH, JSON.stringify(cache, null, 2));
}
function checkRateLimit(delegateTxId, rate_limit, total_limit) {
  const cache = loadRateLimitCache();
  const now = Math.floor(Date.now() / 1000);
  const hourStart = now - (now % 3600);
  if (!cache[delegateTxId]) {
    cache[delegateTxId] = { count: 0, hour: hourStart, total_count: 0 };
  }
  if (cache[delegateTxId].hour !== hourStart) {
    cache[delegateTxId] = { count: 0, hour: hourStart, total_count: cache[delegateTxId].total_count };
  }
  if (cache[delegateTxId].count >= rate_limit) {
    throw new Error(`Rate limit exceeded: ${rate_limit} inscriptions per hour`);
  }
  if (total_limit && cache[delegateTxId].total_count >= total_limit) {
    throw new Error(`Total inscription limit exceeded: ${total_limit}`);
  }
  cache[delegateTxId].count += 1;
  cache[delegateTxId].total_count = (cache[delegateTxId].total_count || 0) + 1;
  saveRateLimitCache(cache);
}
async function checkGeoIp(geo_ip_restrictions) {
  try {
    const response = await axios.get("https://ip-api.com/json");
    const userCountry = response.data.countryCode;
    if (geo_ip_restrictions[0] !== "none" && !geo_ip_restrictions.includes(userCountry)) {
      throw new Error(`Geo IP restriction: User country (${userCountry}) not allowed`);
    }
  } catch (e) {
    console.warn(`Warning: Geo IP check failed (${e.message}). Allowing minting.`);
  }
}
async function handleWallet() {
  const subcmd = process.argv[3];
  switch (subcmd) {
    case "new":
      return walletNew();
    case "sync":
      return await walletSync();
    case "balance":
      return await walletBalance();
    case "send":
      return await walletSend();
    case "sendutxo":
      return await walletSendUTXO();
    case "split":
      return await walletSplit();
    default:
      throw new Error(`Unknown wallet subcommand: ${subcmd}`);
  }
}
async function doge20() {
  const subcmd = process.argv[3];
  switch (subcmd) {
    case "deploy":
      return await doge20Deploy();
    case "mint":
      return await doge20Transfer("mint");
    case "transfer":
      return await doge20Transfer("transfer");
    default:
      throw new Error(`Unknown doge20 subcommand: ${subcmd}`);
  }
}
async function doge20Deploy() {
  const address = process.argv[4];
  const ticker = process.argv[5];
  const max = process.argv[6];
  const limit = process.argv[7];
  const decimals = process.argv[8] || "18";
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  try {
    if (!Address.isValid(address)) throw new Error("Invalid address");
    if (!ticker.match(/^[A-Za-z]{3,4}$/)) throw new Error("Ticker must be 3 or 4 letters");
    if (!max || isNaN(max) || Number(max) <= 0) throw new Error("Max must be a positive number");
    if (!limit || isNaN(limit) || Number(limit) <= 0) throw new Error("Limit must be a positive number");
    if (isNaN(decimals) || Number(decimals) < 0) throw new Error("Decimals must be a non-negative number");
  } catch (e) {
    console.error(`Validation error: ${e.message}`);
    process.exit(1);
  }
  const doge20Tx = {
    p: "drc-20",
    op: "deploy",
    tick: ticker.toLowerCase(),
    max,
    lim: limit,
    dec: decimals,
    meta: { deployer: wallet.address, timestamp: Math.floor(Date.now() / 1000) },
  };
  const data = Buffer.from(JSON5.stringify(doge20Tx));
  console.log(`Deploying DRC-20 token: ${ticker} to ${address}`);
  const txs = inscribe(wallet, new Address(address), "application/json", data);
  await broadcastAll(txs, wallet);
  console.log("DRC-20 Deploy TXID:", txs[txs.length - 1].hash);
}
async function doge20Transfer(op = "transfer") {
  const address = process.argv[4];
  const ticker = process.argv[5];
  const amount = process.argv[6];
  const to = op === "transfer" ? process.argv[7] : undefined;
  const repeat = Number(process.argv[8]) || 1;
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  try {
    if (!Address.isValid(address)) throw new Error("Invalid address");
    if (!ticker.match(/^[A-Za-z]{3,4}$/)) throw new Error("Ticker must be 3 or 4 letters");
    if (!amount || isNaN(amount) || Number(amount) <= 0) throw new Error("Amount must be a positive number");
    if (op === "transfer" && !Address.isValid(to)) throw new Error("Invalid recipient address");
    if (isNaN(repeat) || repeat <= 0) throw new Error("Repeat must be a positive number");
  } catch (e) {
    console.error(`Validation error: ${e.message}`);
    process.exit(1);
  }
  const doge20Tx = {
    p: "drc-20",
    op,
    tick: ticker.toLowerCase(),
    amt: amount,
    ...(to && { to }),
    meta: { timestamp: Math.floor(Date.now() / 1000) },
  };
  const data = Buffer.from(JSON5.stringify(doge20Tx));
  for (let i = 0; i < repeat; i++) {
    console.log(`${op === "mint" ? "Minting" : "Transferring"} DRC-20 token: ${ticker}, ${i + 1} of ${repeat}`);
    const txs = inscribe(wallet, new Address(address), "application/json", data);
    await broadcastAll(txs, wallet);
    console.log(`DRC-20 ${op} TXID:`, txs[txs.length - 1].hash);
  }
}
async function handleDNS() {
  const subcmd = process.argv[3];
  switch (subcmd) {
    case "deploy":
      return await dnsDeploy();
    case "reg":
      return await dnsReg();
    default:
      throw new Error(`Unknown DNS subcommand: ${subcmd}`);
  }
}
async function handleDunes() {
  const subcmd = process.argv[3];
  switch (subcmd) {
    case "deploy":
      return await deployDune();
    case "mint":
      return await mintDune();
    case "batchMint":
      return await batchMintDune();
    case "transfer":
      return await transferDune();
    case "sendMultiwallet":
      return await sendDuneMultiwallet();
    case "sendNoProtocol":
      return await sendDunesNoProtocol();
    default:
      throw new Error(`Unknown dunes subcommand: ${subcmd}`);
  }
}
async function deployDune() {
  const tick = process.argv[4];
  const symbol = process.argv[5];
  const limit = process.argv[6];
  const divisibility = process.argv[7];
  const cap = process.argv[8] === "null" ? null : process.argv[8];
  const heightStart = process.argv[9] === "null" ? null : process.argv[9];
  const heightEnd = process.argv[10] === "null" ? null : process.argv[10];
  const offsetStart = process.argv[11] === "null" ? null : process.argv[11];
  const offsetEnd = process.argv[12] === "null" ? null : process.argv[12];
  const premine = process.argv[13] === "null" ? null : process.argv[13];
  const turbo = process.argv[14] === "true";
  const openMint = process.argv[15] === "true";
  const parentId = process.argv[16] || null;
  const priceAmount = process.argv[17] === "null" ? null : process.argv[17];
  const pricePayTo = process.argv[18] === "null" ? null : process.argv[18];
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  try {
    if (!tick || !tick.match(/^[A-Z•]+$/)) throw new Error("Tick must be uppercase letters and/or spacers (•)");
    if (!symbol || symbol.length !== 1) throw new Error("Symbol must be a single character");
    if (!limit || isNaN(limit) || Number(limit) <= 0) throw new Error("Limit must be a positive number");
    if (!divisibility || isNaN(divisibility) || Number(divisibility) < 0) throw new Error("Divisibility must be a non-negative number");
    if (cap && (isNaN(cap) || Number(cap) <= 0)) throw new Error("Cap must be a positive number if provided");
    if (heightStart && (isNaN(heightStart) || Number(heightStart) < 0)) throw new Error("HeightStart must be a non-negative number if provided");
    if (heightEnd && (isNaN(heightEnd) || Number(heightEnd) < 0)) throw new Error("HeightEnd must be a non-negative number if provided");
    if (offsetStart && (isNaN(offsetStart) || Number(offsetStart) < 0)) throw new Error("OffsetStart must be a non-negative number if provided");
    if (offsetEnd && (isNaN(offsetEnd) || Number(offsetEnd) < 0)) throw new Error("OffsetEnd must be a non-negative number if provided");
    if (premine && (isNaN(premine) || Number(premine) <= 0)) throw new Error("Premine must be a positive number if provided");
    if (priceAmount && (isNaN(priceAmount) || Number(priceAmount) <= 0)) throw new Error("PriceAmount must be a positive number if provided");
    if (pricePayTo && !Address.isValid(pricePayTo)) throw new Error("Invalid pricePayTo address");
    const blockHeight = await getBlockCount();
    const spacedDune = spacedDunefromStr(tick);
    const duneValue = parseDuneFromString(spacedDune.dune).value;
    if (duneValue < minimumAtHeight(blockHeight)) {
      throw new Error(`Dune name ${tick} is below minimum value for block height ${blockHeight}`);
    }
  } catch (e) {
    console.error(`Validation error: ${e.message}`);
    process.exit(1);
  }
  const spacedDune = spacedDunefromStr(tick);
  const terms = openMint ? new Terms(limit, cap, offsetStart, offsetEnd, heightStart, heightEnd, priceAmount && pricePayTo ? { amount: priceAmount, pay_to: pricePayTo } : null) : null;
  const etching = new Etching(divisibility, terms, turbo, premine, spacedDune.dune.value, spacedDune.spacers, symbol);
  const script = constructScript(etching);
  let tx = new Transaction();
  if (parentId) {
    const parentUtxo = await fetchParentUtxo(parentId);
    tx.from(parentUtxo);
  }
  tx.addOutput(new Transaction.Output({ script, satoshis: 0 }));
  if (premine) tx.to(wallet.address, 100000);
  await fund(wallet, tx);
  await broadcast(tx, wallet, true);
  console.log(`Dune deployed with tx hash: ${tx.hash}`);
}
async function mintDune() {
  const id = process.argv[4];
  let amount = process.argv[5];
  const receiver = process.argv[6];
  try {
    if (!id.match(/^\d+[:/]\d+$/)) throw new Error("Invalid Dune ID format (use block:index or block/indeX)");
    if (!Address.isValid(receiver)) throw new Error("Invalid receiver address");
    if (isNaN(amount) || Number(amount) < 0) throw new Error("Amount must be a non-negative number");
  } catch (e) {
    console.error(`Validation error: ${e.message}`);
    process.exit(1);
  }
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  let duneId = parseDuneId(id, true);
  if (amount === "0") {
    const duneData = await getDune(id);
    amount = BigInt(duneData.limit) * BigInt(10 ** duneData.divisibility);
  } else {
    amount = BigInt(amount);
  }
  const edicts = [new Edict(duneId, amount, 1)];
  const script = constructScript(null, undefined, null, edicts);
  const tx = new Transaction();
  tx.addOutput(new Transaction.Output({ script, satoshis: 0 }));
  tx.to(receiver, 100000);
  await fund(wallet, tx);
  await broadcast(tx, wallet, true);
  console.log(`Dune minted with tx hash: ${tx.hash}`);
}
async function batchMintDune() {
  const id = process.argv[4];
  const amount = process.argv[5];
  const count = parseInt(process.argv[6]);
  const receiver = process.argv[7];
  const [height, index] = id.split(":");
  const duneId = (BigInt(height) << 16n) | BigInt(index);
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  for (let i = 0; i < count; i++) {
    const edicts = [new Edict(duneId, amount, 1)];
    const script = constructScript(null, undefined, null, edicts);
    const tx = new Transaction();
    tx.addOutput(new Transaction.Output({ script, satoshis: 0 }));
    tx.to(receiver, 100000);
    await fund(wallet, tx);
    await broadcast(tx, wallet, true);
    console.log(`Batch mint ${i + 1}/${count} TXID: ${tx.hash}`);
  }
}
async function transferDune() {
  const txhash = process.argv[4];
  const vout = parseInt(process.argv[5]);
  const dune = process.argv[6];
  const amount = process.argv[7];
  const to = process.argv[8];
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const utxo = wallet.utxos.find((u) => u.txid === txhash && u.vout === vout);
  if (!utxo) throw new Error(`UTXO ${txhash}:${vout} not found`);
  const dunes = await getDunesForUtxo(`${utxo.txid}:${utxo.vout}`);
  const duneInfo = dunes.find((d) => d.dune === dune);
  if (!duneInfo) throw new Error(`Dune ${dune} not found on UTXO`);
  const duneId = parseDuneId(duneInfo.id);
  const edicts = [new Edict(duneId, amount, 1)];
  const script = constructScript(null, undefined, null, edicts);
  const tx = new Transaction();
  tx.from(utxo);
  tx.addOutput(new Transaction.Output({ script, satoshis: 0 }));
  tx.to(to, 100000);
  await fund(wallet, tx);
  await broadcast(tx, wallet, true);
  console.log(`Dune transferred with tx hash: ${tx.hash}`);
}
async function sendDuneMultiwallet() {
  const txhash = process.argv[4];
  const vout = parseInt(process.argv[5]);
  const dune = process.argv[6];
  const decimals = parseInt(process.argv[7]);
  const amounts = process.argv[8].split(",").map(BigInt);
  const addresses = process.argv[9].split(",");
  if (amounts.length !== addresses.length) throw new Error("Amounts and addresses length mismatch");
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const utxo = wallet.utxos.find((u) => u.txid === txhash && u.vout === vout);
  if (!utxo) throw new Error(`UTXO ${txhash}:${vout} not found`);
  const dunes = await getDunesForUtxo(`${utxo.txid}:${u.vout}`);
  const duneInfo = dunes.find((d) => d.dune === dune);
  if (!duneInfo) throw new Error(`Dune ${dune} not found on UTXO`);
  const totalAmount = amounts.reduce((acc, curr) => acc + curr, 0n);
  const duneId = parseDuneId(duneInfo.id);
  const edicts = amounts.map((amt, i) => new Edict(duneId, amt, i + 2));
  const script = constructScript(null, 1, null, edicts);
  const tx = new Transaction();
  tx.from(utxo);
  tx.addOutput(new Transaction.Output({ script, satoshis: 0 }));
  tx.to(wallet.address, 100000);
  addresses.forEach((addr) => tx.to(addr, 100000));
  await fund(wallet, tx);
  await broadcast(tx, wallet, true);
  console.log(`Dune sent to multiple wallets with tx hash: ${tx.hash}`);
}
async function sendDunesNoProtocol() {
  const address = process.argv[4];
  const utxoAmount = parseInt(process.argv[5]);
  const dune = process.argv[6];
  const message = process.argv[7] || "";
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  if (!Address.isValid(address)) {
    console.error("❌ Invalid address.");
    process.exit(1);
  }
  if (isNaN(utxoAmount) || utxoAmount <= 0) {
    console.error("❌ UTXO amount must be a positive number.");
    process.exit(1);
  }
  if (!dune) {
    console.error("❌ Dune name is required.");
    process.exit(1);
  }
  if (message && Buffer.from(message, "utf8").length > MAX_OP_RETURN_BYTES) {
    console.error(`❌ Message exceeds ${MAX_OP_RETURN_BYTES}-byte OP_RETURN limit.`);
    process.exit(1);
  }
  let opReturnData;
  if (message.startsWith('hex:')) {
    opReturnData = Buffer.from(message.slice(4), 'hex');
  } else if (message.startsWith('base64:')) {
    opReturnData = Buffer.from(message.slice(7), 'base64');
  } else {
    opReturnData = Buffer.from(message, 'utf8');
  }
  opReturnData = opReturnData.slice(0, MAX_OP_RETURN_BYTES);
  const dunesUtxos = await Promise.all(
    wallet.utxos.map(async (u) => {
      const dunes = await getDunesForUtxo(`${u.txid}:${u.vout}`);
      return dunes.some((d) => d.dune === dune) ? u : null;
    })
  ).then(results => results.filter(u => u !== null).slice(0, utxoAmount));
  if (dunesUtxos.length < utxoAmount) throw new Error("Not enough Dune UTXOs");
  const tx = new Transaction();
  tx.from(dunesUtxos);
  tx.to(address, dunesUtxos.reduce((acc, u) => acc + u.satoshis, 0));
  if (message) {
    const opReturnData = Buffer.from(message, "utf8").slice(0, MAX_OP_RETURN_BYTES);
    const opReturnScript = new Script().add("OP_RETURN").add(opReturnData);
    tx.addOutput(new Transaction.Output({ script: opReturnScript, satoshis: 0 }));
  }
  await fund(wallet, tx);
  await broadcast(tx, wallet, true);
  console.log(`Dunes sent without protocol with tx hash: ${tx.hash}`);
}
async function handleMarket() {
  const subcmd = process.argv[3];
  const marketplace = process.argv[process.argv.length - 1];
  switch (subcmd) {
    case "list":
      return await listToken(process.argv[4], process.argv[5], process.argv[6], marketplace);
    case "orderbook":
      return await getOrderBook(process.argv[4], marketplace);
    case "offer":
      return await getOffer(process.argv[4], marketplace);
    case "activities":
      return await streamActivities(marketplace);
    case "purchase":
      return await purchase(process.argv[4], marketplace);
    case "inscription":
      return await getInscriptionContent(process.argv[4], marketplace);
    default:
      throw new Error(`Unknown market subcommand: ${subcmd}`);
  }
}
async function listToken(tokenType, tokenId, price, marketplace) {
  const baseUrl = MARKETPLACES[marketplace];
  if (!baseUrl) throw new Error(`Unknown marketplace: ${marketplace}`);
  const url = `${baseUrl}/list`;
  const data = { tokenType, tokenId, price };
  try {
    const response = await axios.post(url, data);
    console.log(`Token listed on ${marketplace}:`, response.data);
    return response.data;
  } catch (e) {
    console.warn(`Marketplace list failed: ${e.message}. Checking wallet locally.`);
    // Fallback: Check if token exists in wallet and mark as listed
    const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
    const utxo = wallet.utxos.find(u => u.data?.some(d => d.inscriptionId === tokenId || d.drc20 === tokenId));
    if (utxo) {
      utxo.data.forEach(d => {
        if (d.inscriptionId === tokenId || d.drc20 === tokenId) d.listed = true;
      });
      fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
      console.log(`Marked ${tokenId} as listed locally for ${marketplace}`);
      return { status: "local", tokenId, price };
    }
    throw new Error(`Failed to list ${tokenId} on ${marketplace}`);
  }
}
async function getOrderBook(ticker, marketplace) {
  const baseUrl = MARKETPLACES[marketplace];
  if (!baseUrl) throw new Error(`Unknown marketplace: ${marketplace}`);
  // Normalize ticker for Dunes
  let normalizedTicker = ticker.toUpperCase();
  if (normalizedTicker.includes("SNOOPDOGECOIN")) {
    normalizedTicker = "SNOOP•DOGE•COIN";
  }
  // Try RPC-based transaction history for wallet
  try {
    const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
    const transactions = await listTransactions(wallet.address, 100);
    const orders = transactions
      .filter(tx => tx.category === "receive" || tx.category === "send")
      .map(tx => ({
        price: tx.fee ? Math.abs(tx.fee * 1e8) : "unknown",
        amount: tx.amount * 1e8,
        total: tx.amount * 1e8,
        type: tx.category === "receive" ? "buy" : "sell",
      }));
    const buyOrders = orders.filter(o => o.type === "buy");
    const sellOrders = orders.filter(o => o.type === "sell");
    console.log(`Order book for ${normalizedTicker} (RPC-based, wallet transactions):`);
    console.log('Buy Orders:');
    console.table(buyOrders.length ? buyOrders : [{ message: 'No buy orders found' }]);
    console.log('Sell Orders:');
    console.table(sellOrders.length ? sellOrders : [{ message: 'No sell orders found' }]);
    return { buyOrders, sellOrders };
  } catch (e) {
    console.warn(`RPC orderbook failed: ${e.message}. Falling back to marketplace API.`);
  }
  // Fallback to marketplace API
  const url = marketplace === "doggymarket" 
    ? `${baseUrl}/drc-20${normalizedTicker !== ticker.toUpperCase() ? `/${normalizedTicker}` : `/${ticker}`}`
    : `${baseUrl}/trading`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    const buyOrders = [];
    const sellOrders = [];
    if (marketplace === "doggymarket") {
      $('table:contains("Buy Orders") tbody tr, table.orderbook-buy tbody tr').each((i, tr) => {
        const cells = $(tr).find('td');
        if (cells.length >= 3) {
          buyOrders.push({
            price: cells.eq(0).text().trim(),
            amount: cells.eq(1).text().trim(),
            total: cells.eq(2).text().trim()
          });
        }
      });
      $('table:contains("Sell Orders") tbody tr, table.orderbook-sell tbody tr').each((i, tr) => {
        const cells = $(tr).find('td');
        if (cells.length >= 3) {
          sellOrders.push({
            price: cells.eq(0).text().trim(),
            amount: cells.eq(1).text().trim(),
            total: cells.eq(2).text().trim()
          });
        }
      });
    } else if (marketplace === "dogelabs") {
      $('table:contains("Buy Orders") tbody tr, table#buy-orders tbody tr').each((i, tr) => {
        const cells = $(tr).find('td');
        if (cells.length >= 3) {
          buyOrders.push({
            price: cells.eq(0).text().trim(),
            amount: cells.eq(1).text().trim(),
            total: cells.eq(2).text().trim()
          });
        }
      });
      $('table:contains("Sell Orders") tbody tr, table#sell-orders tbody tr').each((i, tr) => {
        const cells = $(tr).find('td');
        if (cells.length >= 3) {
          sellOrders.push({
            price: cells.eq(0).text().trim(),
            amount: cells.eq(1).text().trim(),
            total: cells.eq(2).text().trim()
          });
        }
      });
    }
    console.log(`Order book for ${normalizedTicker} on ${marketplace}:`);
    console.log('Buy Orders:');
    console.table(buyOrders.length ? buyOrders : [{ message: 'No buy orders found' }]);
    console.log('Sell Orders:');
    console.table(sellOrders.length ? sellOrders : [{ message: 'No sell orders found' }]);
    return { buyOrders, sellOrders };
  } catch (e) {
    console.error(`Failed to fetch orderbook for ${normalizedTicker} on ${marketplace}: ${e.message}`);
    return { buyOrders: [], sellOrders: [] };
  }
}
async function getOffer(offerId, marketplace) {
  const baseUrl = MARKETPLACES[marketplace];
  if (!baseUrl) throw new Error(`Unknown marketplace: ${marketplace}`);
  const url = `${baseUrl}/offers/${offerId}`;
  const response = await axios.get(url);
  console.log(`Offer details for ${offerId} on ${marketplace}:`, response.data);
  return response.data;
}
async function streamActivities(marketplace) {
  const baseUrl = MARKETPLACES[marketplace];
  if (!baseUrl) throw new Error(`Unknown marketplace: ${marketplace}`);
  const url = `${baseUrl}/activities`;
  const response = await axios.get(url, { responseType: "stream" });
  response.data.on("data", (chunk) => console.log(chunk.toString()));
}
async function purchase(offerId, marketplace) {
  const baseUrl = MARKETPLACES[marketplace];
  if (!baseUrl) throw new Error(`Unknown marketplace: ${marketplace}`);
  const url = `${baseUrl}/purchase`;
  const data = { offerId };
  const response = await axios.post(url, data);
  console.log(`Purchased offer ${offerId} on ${marketplace}:`, response.data);
  return response.data;
}
async function getInscriptionContent(txid, marketplace) {
  const baseUrl = MARKETPLACES[marketplace];
  if (!baseUrl) throw new Error(`Unknown marketplace: ${marketplace}`);
  const url = `${baseUrl}/inscription/${txid}`;
  const response = await axios.get(url);
  console.log(`Inscription content for ${txid} on ${marketplace}:`, response.data);
  return response.data;
}
async function showPending() {
  if (!fs.existsSync("utxo.json")) return console.log("No pending UTXOs.");
  const utxos = JSON.parse(fs.readFileSync("utxo.json"));
  if (!utxos.length) return console.log("No pending UTXOs in mempool.");
  console.log("🔁 Pending UTXOs (from mempool):");
  utxos.forEach(u => console.log(` - ${u.txid}${u.vout !== undefined ? `:${u.vout}` : ""}`));
}
function updateEnvFeeRate(feeRate) {
  const envPath = ".env";
  let envLines = fs.readFileSync(envPath, "utf-8").split("\n");
  let found = false;
  envLines = envLines.map(line => {
    if (line.startsWith("FEE_PER_KB=")) {
      found = true;
      return `FEE_PER_KB=${feeRate}`;
    }
    return line;
  });
  if (!found) envLines.push(`FEE_PER_KB=${feeRate}`);
  fs.writeFileSync(envPath, envLines.join("\n"));
}
async function decodeDunesScript(script) {
  if (!script) throw new Error("Please provide a script to decode");
  const parts = script.split(" ");
  if (parts[0] !== "OP_RETURN") throw new Error("Not an OP_RETURN script");
  if (parts[1] !== String.fromCharCode(IDENTIFIER[0])) throw new Error("Not a Dunes script");

  const payload = Buffer.concat(parts.slice(2).map(p => Buffer.from(p, "hex")));
  let offset = 0;
  const decoded = {
    protocol: parts[1],
    fields: []
  };

  while (offset < payload.length) {
    // Read varint for tag
    let tag = 0;
    let shift = 0;
    while (true) {
      if (offset >= payload.length) break;
      const byte = payload[offset++];
      tag |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) break;
      shift += 7;
    }

    // Read value based on tag
    let value;
    if (tag === Tag.Dune) {
      // Read varint for dune value
      let duneValue = 0n;
      shift = 0;
      while (true) {
        if (offset >= payload.length) break;
        const byte = payload[offset++];
        duneValue |= BigInt(byte & 0x7f) << BigInt(shift);
        if (!(byte & 0x80)) break;
        shift += 7;
      }
      value = duneValue.toString();
    } else if (tag === Tag.Body) {
      // Parse edicts
      const edicts = [];
      let lastId = 0n;
      while (offset < payload.length) {
        let idDelta = 0n, amount = 0n, output = 0;
        for (const field of ['idDelta', 'amount', 'output']) {
          let num = 0;
          shift = 0;
          while (true) {
            if (offset >= payload.length) break;
            const byte = payload[offset++];
            num |= (byte & 0x7f) << shift;
            if (!(byte & 0x80)) break;
            shift += 7;
          }
          if (field === 'idDelta') idDelta = BigInt(num);
          else if (field === 'amount') amount = BigInt(num);
          else output = num;
        }
        if (idDelta === 0n && amount === 0n && output === 0) break;
        edicts.push({ id: (lastId + idDelta).toString(), amount: amount.toString(), output });
        lastId += idDelta;
      }
      value = edicts;
    } else {
      // Read varint or bytes
      let num = 0;
      shift = 0;
      while (true) {
        if (offset >= payload.length) break;
        const byte = payload[offset++];
        num |= (byte & 0x7f) << shift;
        if (!(byte & 0x80)) break;
        shift += 7;
      }
      value = num.toString();
    }
    decoded.fields.push({ tag, value });
  }
  return decoded;
}
function chunkToNumber(chunk) {
  if (chunk.opcodenum === 0) return 0;
  if (chunk.opcodenum === 1) return chunk.buf[0];
  if (chunk.opcodenum === 2) return chunk.buf[1] * 255 + chunk.buf[0];
  if (chunk.opcodenum > 80 && chunk.opcodenum <= 96) return chunk.opcodenum - 80;
  return undefined;
}
async function indexMempoolAndPending(walletAddress) {
  try {
    const { data: mempool } = await axios.post(RPC_URL, {
      jsonrpc: "1.0", id: "doginals", method: "getrawmempool", params: [true]
    }, { auth: RPC_AUTH });
    fs.writeFileSync("./mempool.json", JSON.stringify(mempool, null, 2));
    const utxos = Object.entries(mempool)
      .filter(([txid, tx]) => tx?.depends?.length === 0)
      .map(([txid]) => ({ txid, unconfirmed: true }));
    fs.writeFileSync("./utxo.json", JSON.stringify(utxos, null, 2));
  } catch (e) {
    console.warn("Failed to index mempool:", e.message);
  }
}
async function extractOpReturnMessages(txid) {
  try {
    const rawTx = await getRawTransaction(txid, 1);
    const messages = [];
    for (const output of rawTx.vout) {
      if (output.scriptPubKey.type === "nulldata") {
        const script = new Script(output.scriptPubKey.hex);
        const data = Buffer.concat(script.chunks.slice(1).map(chunk => chunk.buf || Buffer.alloc(0)));
        let message;
        if (data[0] === IDENTIFIER[0]) { // Check for 'D' protocol identifier
          try {
            const decoded = await decodeDunesScript(script.toString());
            message = JSON.stringify(decoded, null, 2); // Display decoded Dunes data
          } catch (e) {
            message = `Dunes script (hex): ${data.toString('hex')}`; // Fallback to hex
          }
        } else {
          try {
            message = data.toString('utf8');
            if (!/^[ -~]*$/.test(message) && message !== '') {
              throw new Error('Non-printable characters detected');
            }
          } catch (e) {
            message = data.toString('latin1'); // Preserve all bytes
          }
        }
        messages.push(message);
      }
    }
    return messages;
  } catch (e) {
    console.warn(`Failed to extract OP_RETURN messages for TXID ${txid}: ${e.message}`);
    return [];
  }
}
async function getTxOpReturnMessages(txids) {
  const uniqueTxids = [...new Set(txids)];
  const messagesMap = new Map();
  for (const txid of uniqueTxids) {
    const messages = await extractOpReturnMessages(txid);
    messagesMap.set(txid, messages);
  }
  return messagesMap;
}
async function extractOpMessage(txid) {
  const messages = await extractOpReturnMessages(txid);
  if (messages.length === 0) {
    console.log(`No OP_RETURN messages found for TXID ${txid}`);
  } else {
    console.log(`OP_RETURN Messages for TXID ${txid}:`);
    messages.forEach((msg, i) => {
      console.log(`  Message ${i + 1}: ${msg}`);
    });
  }
}
async function extractOpMessageAll() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const transactions = await listTransactions(wallet.address, 10000, 0, true);
  const txids = [...new Set(transactions.map(tx => tx.txid))]; // Ensure unique TXIDs
  const txMessages = await getTxOpReturnMessages(txids);

  // Cross-reference with UTXO data
  const utxoMessages = new Map();
  wallet.utxos.forEach(u => {
    if (u.opReturnMessages && u.opReturnMessages.length > 0) {
      utxoMessages.set(u.txid, u.opReturnMessages);
    }
  });

  let messageCount = 0;
  console.log("OP_RETURN Messages in Wallet Transaction History:");
  for (const txid of txids) {
    let messages = txMessages.get(txid) || utxoMessages.get(txid) || [];
    if (messages.length > 0) {
      console.log(`  TXID: ${txid}`);
      messages.forEach((msg, i) => {
        console.log(`    Message ${i + 1}: ${msg}`);
      });
      messageCount += messages.length;
    }
  }
  if (messageCount === 0) {
    console.log("  No OP_RETURN messages found in wallet history.");
  } else {
    console.log(`Total OP_RETURN messages found: ${messageCount}`);
  }
}
async function walletSync() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  console.log("Syncing UTXOs with RPC and ORD API...");
  await indexMempoolAndPending(wallet.address);
  // Prioritize RPC for UTXOs
  let rpcUtxos = [];
  try {
    rpcUtxos = await listUnspent(0, 9999999, [wallet.address], true);
    console.log(`RPC fetched ${rpcUtxos.length} UTXOs`);
  } catch (e) {
    console.warn(`RPC listunspent failed: ${e.message}. Falling back to ORD API.`);
    rpcUtxos = await fetchAllUnspentOutputs(wallet.address);
    console.log(`ORD API fetched ${rpcUtxos.length} UTXOs`);
  }
  // Get confirmed and unconfirmed balances
  const confirmedBalance = await getBalance("", 1, false);
  const unconfirmedBalance = await getUnconfirmedBalance();
  if (unconfirmedBalance > 0) console.log(`Unconfirmed balance: ${unconfirmedBalance / 1e8} DOGE`);
  // Merge UTXOs (prefer RPC)
  const allUtxos = [];
  rpcUtxos.forEach(ru => allUtxos.push(ru));
  try {
    const ordUtxos = await fetchAllUnspentOutputs(wallet.address);
    ordUtxos.forEach(ou => {
      if (!allUtxos.some(ru => ru.txid === ou.txid && ru.vout === ou.vout)) {
        allUtxos.push(ou);
      }
    });
  } catch (e) {
    console.warn(`ORD API fetch failed: ${e.message}`);
  }
  console.log(`Total unique UTXOs: ${allUtxos.length}`);
  // Fetch NFT data
  let nftData = [];
  try {
    const nftRes = await doggyMarketApi.get(`/wallet/${wallet.address}/nfts`);
    nftData = nftRes.data.data || [];
  } catch (e) {
    console.warn(`Failed to fetch NFT data for wallet ${wallet.address}: ${e.message}`);
  }
  // Classify UTXOs
  wallet.utxos = await Promise.all(allUtxos.map(async (u) => {
    const utxo = {
      txid: u.txid,
      vout: u.vout,
      script: u.script,
      satoshis: u.satoshis,
      confirmations: u.confirmations,
      type: "spendable",
      address: wallet.address,
      account: "1st Apestract Doginals Inscriber"
    };
    try {
      const inscriptionId = await getInscriptionIdForUtxo(u.txid, u.vout);
      if (inscriptionId) {
        const details = await getInscriptionDetails(inscriptionId);
        const contentRes = await ordApi.get(`/content/${inscriptionId}`, { responseType: "arraybuffer" });
        const inscription = {
          contentType: details?.contentType || contentRes.headers["content-type"] || "application/octet-stream",
          data: Buffer.from(contentRes.data)
        };
        utxo.content = inscription.contentType;
        const type = await classifyInscription(inscription, u.txid, u.vout, wallet.address);
        utxo.type = type;
        let inscriptionData = {
          inscriptionId,
          inscriptionNumber: details?.inscriptionNumber || null,
          contentType: inscription.contentType,
          contentLength: details?.contentLength || inscription.data.length,
          inscribedAt: details?.inscribedAt || null,
          blockHeight: details?.blockHeight || null,
          inscribedBy: details?.inscribedBy || null,
          owner: details?.owner || wallet.address,
          utxo: `${u.txid}:${u.vout}`,
          outputValue: details?.outputValue || u.satoshis,
          offset: details?.offset || 0,
          type,
          listed: details?.listed || false,
          txs: details?.txs || [details?.genesisTx] || []
        };
        if (type === "doge20") {
          const parsed = safeJsonParse(inscription.data);
          inscriptionData = {
            ...inscriptionData,
            drc20: parsed?.tick?.toUpperCase() || "UNKNOWN",
            totalAmountAvailable: parsed?.amt || parsed?.at || "0",
            transferableAmount: parsed?.op === "transfer" ? parsed.amt || parsed.at || "0" : "0",
            total: parsed?.amt || parsed?.at || "0",
            totalTransferedIntoWallet: "0",
            totalTransferedOutOfWallet: "0"
          };
          utxo.drc20s = [inscriptionData];
        } else if (type === "dogemaps") {
          const dataString = inscription.data.toString("utf-8").trim();
          inscriptionData.dogemap = parseInt(dataString.replace('.dogemap', '')) || null;
          utxo.data = [inscriptionData];
        } else if (type === "nft") {
          const nft = nftData.find(n => n.inscriptionId === inscriptionId) || {};
          inscriptionData.nft = nft.nft ? {
            collectionId: nft.nft.collectionId || null,
            itemName: nft.nft.itemName || null,
            itemId: nft.nft.itemId || null,
            attributes: nft.nft.attributes || {}
          } : null;
          utxo.data = [inscriptionData];
        } else {
          utxo.data = [inscriptionData];
        }
      } else {
        const dunes = await getDunesForUtxo(`${u.txid}:${u.vout}`);
        if (dunes.length) {
          utxo.type = "dunes";
          utxo.dunes = dunes;
        } else if (u.satoshis <= DUST_THRESHOLD && u.confirmations > 0) {
          utxo.type = "inscription";
        }
      }
    } catch (e) {
      console.warn(`Failed to classify UTXO ${u.txid}:${u.vout}: ${e.message}`);
      if (u.satoshis <= DUST_THRESHOLD && u.confirmations > 0) utxo.type = "inscription";
    }
    return utxo;
  }));
  // Fetch OP_RETURN messages for all UTXOs' transactions
  const txids = [...new Set(wallet.utxos.map(u => u.txid))];
  const txMessages = await getTxOpReturnMessages(txids);
  // Attach messages to UTXOs
  wallet.utxos.forEach(u => {
    u.opReturnMessages = txMessages.get(u.txid) || [];
  });
  // Count UTXOs with messages
  const numUtxosWithMessages = wallet.utxos.filter(u => u.opReturnMessages.length > 0).length;
  console.log(`Total UTXOs with OP_RETURN messages: ${numUtxosWithMessages}`);
  // Fetch DRC-20 balances from ORD API
  try {
    const drc20Res = await drc20Api.get(`/${wallet.address}`);
    const drc20Balances = drc20Res.data.data || [];
    wallet.drc20Balances = {};
    wallet.utxos.forEach(u => {
      if (u.type === "doge20" && u.drc20s) {
        u.drc20s.forEach(d => {
          const apiBalance = drc20Balances.find(b => b.tick.toUpperCase() === d.drc20);
          if (apiBalance) {
            d.totalAmountAvailable = apiBalance.amount || "0";
            d.transferableAmount = apiBalance.Transferable || "0";
            d.total = apiBalance.total || "0";
            d.totalTransferedIntoWallet = "0";
            d.totalTransferedOutOfWallet = "0";
            wallet.drc20Balances[d.drc20] = {
              total: apiBalance.total || "0",
              transferable: apiBalance.Transferable || "0"
            };
          }
        });
      }
    });
  } catch (e) {
    console.warn(`DRC-20 API fetch failed: ${e.message}. Using local UTXO data.`);
    wallet.drc20Balances = {};
    wallet.utxos.forEach(u => {
      if (u.type === "doge20" && u.drc20s) {
        u.drc20s.forEach(d => {
          wallet.drc20Balances[d.drc20] = {
            total: d.totalAmountAvailable || "0",
            transferable: d.transferableAmount || "0"
          };
        });
      }
    });
  }
  fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
  await displayWalletSummary(wallet);
}
async function walletBalance() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  if (!wallet.utxos || wallet.utxos.length === 0) {
    console.log("Wallet state empty, syncing...");
  }
  await walletSync();
}
async function displayWalletSummary(wallet) {
  const groups = {
    spendable: [],
    dunes: [],
    doge20: [],
    dns: [],
    dogemaps: [],
    delegate: [],
    nft: [],
    inscription: []
  };
  for (const u of wallet.utxos) {
    if (groups[u.type]) groups[u.type].push(u);
    else groups.inscription.push(u);
  }
  const toDoge = (arr) => arr.reduce((sum, u) => sum + (u.satoshis || 0), 0) / 1e8;
  const total = toDoge(wallet.utxos);
  const spendable = toDoge(groups.spendable.filter(u => u.confirmations > 0));
  const inscriptions = wallet.utxos.filter((u) => u.type !== "spendable");
  const inscriptionValue = toDoge(inscriptions);
  const nftIns = groups.nft;
  const nftValue = toDoge(nftIns);
  const dunes = groups.dunes;
  const dunesValue = toDoge(dunes);
  const dnsValue = toDoge(groups.dns);
  const maps = groups.dogemaps;
  const mapsValue = toDoge(maps);
  const delegateValue = toDoge(groups.delegate);
  const doge20 = groups.doge20;
  const doge20Value = toDoge(doge20);
  const allDunes = dunes.flatMap((u) => u.dunes || []);
  const doge20Tokens = doge20.flatMap(u => u.drc20s || []);
  const mapsTokens = maps.flatMap(u => u.data || []);
  const drc20Tickers = {};
  for (const t of doge20Tokens) {
    if (!t?.drc20) continue;
    const tick = t.drc20;
    if (!drc20Tickers[tick]) drc20Tickers[tick] = { total: 0n };
    drc20Tickers[tick].total += BigInt(wallet.drc20Balances[tick]?.total || t.totalAmountAvailable || 0);
  }
  const mapsTickers = {};
  for (const m of mapsTokens) {
    if (m.type === "dogemaps" && m.dogemap !== null) {
      const tick = `${m.dogemap}.dogemap`;
      if (!mapsTickers[tick]) mapsTickers[tick] = { total: 0n };
      mapsTickers[tick].total += BigInt(1);
    }
  }
  console.log(`\nWallet synced:\n\n"1st Apestract Doginals Inscriber"\n${wallet.address}\n`);
  console.log(`- Total Balance: ${total.toFixed(8)} DOGE`);
  console.log(`- Spendable Balance: ${spendable.toFixed(8)} DOGE`);
  console.log(`- Total Inscriptions: ${inscriptions.length} (Value: ${inscriptionValue.toFixed(8)} DOGE)`);
  console.log(`- Doginal\\NFT Inscriptions: ${nftIns.length} (Value: ${nftValue.toFixed(8)} DOGE)`);
  console.log(`- Dunes: ${dunes.length} (Value: ${dunesValue.toFixed(8)} DOGE)`);
  allDunes.forEach(d => console.log(` * ${d.dune}: ${d.amount}`));
  console.log(`- DRC-20: ${doge20.length} (Value: ${doge20Value.toFixed(8)} DOGE)`);
  for (const [tick, v] of Object.entries(drc20Tickers)) {
    console.log(` * ${tick}: ${v.total}`);
  }
  console.log(`- DNS: ${groups.dns.length} (Value: ${dnsValue.toFixed(8)} DOGE)`);
  console.log(`- Dogemaps: ${maps.length} (Value: ${mapsValue.toFixed(8)} DOGE)`);
  for (const [tick, v] of Object.entries(mapsTickers)) {
    console.log(` * ${tick}`);
  }
  console.log(`- Delegates: ${groups.delegate.length} (Value: ${delegateValue.toFixed(8)} DOGE)`);
  console.log(`- Other Inscriptions: ${groups.inscription.length} (Value: ${toDoge(groups.inscription).toFixed(8)} DOGE)`);
}
function walletNew() {
  if (fs.existsSync(WALLET_PATH)) throw new Error("Wallet already exists");
  const privateKey = new PrivateKey();
  const wallet = { privkey: privateKey.toWIF(), address: privateKey.toAddress().toString(), utxos: [] };
  fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
  console.log("New wallet created:", wallet.address);
}
async function walletSend() {
  const address = process.argv[4];
  const amount = parseFloat(process.argv[5]);
  const message = process.argv[6] || "";
  if (!address || isNaN(amount) || amount <= 0) {
    console.error("❌ Usage: node . wallet send <address> <amount> [optional-message]");
    process.exit(1);
  }
  if (!Address.isValid(address)) {
    console.error("❌ Invalid address.");
    process.exit(1);
  }
  if (message && Buffer.from(message, "utf8").length > MAX_OP_RETURN_BYTES) {
    console.error(`❌ Message exceeds ${MAX_OP_RETURN_BYTES}-byte OP_RETURN limit.`);
    process.exit(1);
  }
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const sendAmount = Math.floor(amount * 1e8);
  const FEE_BUFFER = 1000000;
  const spendables = wallet.utxos.filter(
    (u) => u.type === "spendable" && u.satoshis >= DUST_THRESHOLD && (u.confirmations || 0) > 0
  );
  if (spendables.length === 0) {
    console.error("❌ No confirmed spendable UTXOs available.");
    process.exit(1);
  }
  let selected = [];
  let total = 0;
  for (const u of spendables) {
    selected.push(u);
    total += u.satoshis;
    if (total >= sendAmount + FEE_BUFFER) break;
  }
  if (total < sendAmount + FEE_BUFFER) {
    console.error(`❌ Insufficient funds. Needed: ${((sendAmount + FEE_BUFFER) / 1e8).toFixed(8)} DOGE, Available: ${(total / 1e8).toFixed(8)} DOGE`);
    process.exit(1);
  }
  const tx = new Transaction().from(selected).to(address, sendAmount);
  if (message) {
    const opReturnData = Buffer.from(message, "utf8").slice(0, MAX_OP_RETURN_BYTES);
    const opReturnScript = new Script().add("OP_RETURN").add(opReturnData);
    tx.addOutput(new Transaction.Output({ script: opReturnScript, satoshis: 0 }));
  }
  tx.change(wallet.address);
  tx.sign(wallet.privkey);
  await broadcast(tx, wallet, true);
  console.log(`✅ Sent ${amount} DOGE to ${address}`);
  console.log(`🔁 TXID: ${tx.hash}`);
  console.log("📦 Inputs:");
  selected.forEach((u, i) =>
    console.log(` [${i}] ${u.txid}:${u.vout} — ${(u.satoshis / 1e8).toFixed(8)} DOGE`)
  );
}
async function walletSendUTXO() {
  const [, , , txid, voutStr, toAddress, msg] = process.argv;
  const vout = parseInt(voutStr);
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const utxo = wallet.utxos.find((u) => u.txid === txid && u.vout === vout);
  if (!utxo) throw new Error(`UTXO ${txid}:${vout} not found in wallet`);
  if (utxo.type && utxo.type !== "spendable") {
    throw new Error(`UTXO ${txid}:${vout} is not spendable (type: ${utxo.type})`);
  }
  const tx = new Transaction();
  tx.from(utxo);
  tx.to(toAddress, utxo.satoshis);
  if (msg) {
    const opReturn = new Script().add("OP_RETURN").add(Buffer.from(msg));
    tx.addOutput(new Transaction.Output({ script: opReturn, satoshis: 0 }));
  }
  await fund(wallet, tx);
  await broadcast(tx, wallet, true);
  console.log(`UTXO sent with TXID: ${tx.hash}`);
}
async function walletSplit() {
  const count = parseInt(process.argv[4]);
  const amountPerSplit = process.argv[5] ? Math.floor(parseFloat(process.argv[5]) * 1e8) : null;
  if (isNaN(count) || count <= 0) {
    console.error("❌ Usage: node . wallet split <count> [amount_per_split]");
    process.exit(1);
  }
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const spendables = wallet.utxos.filter(
    (u) => u.type === "spendable" && u.satoshis >= DUST_THRESHOLD && (u.confirmations || 0) > 0
  );
  if (spendables.length === 0) {
    console.error("❌ No confirmed spendable UTXOs available.");
    process.exit(1);
  }
  const totalSpendable = spendables.reduce((sum, u) => sum + u.satoshis, 0);
  const estimatedFeePerByte = Math.max(1, Math.floor((await estimateSmartFee()) / 1000));
  const estimatedTxSize = 180 + (count * 34) + (spendables.length * 148); // Estimate vsize
  const estimatedFee = estimatedTxSize * estimatedFeePerByte;
  let splitAmount;
  if (amountPerSplit) {
    if (isNaN(amountPerSplit) || amountPerSplit <= 0) {
      console.error("❌ Amount per split must be a positive number.");
      process.exit(1);
    }
    splitAmount = amountPerSplit;
    const totalNeeded = count * splitAmount + estimatedFee;
    if (totalSpendable < totalNeeded) {
      console.error(`❌ Insufficient funds. Required: ${(totalNeeded / 1e8).toFixed(8)} DOGE, Available: ${(totalSpendable / 1e8).toFixed(8)} DOGE`);
      process.exit(1);
    }
  } else {
    const amountToSplit = totalSpendable - estimatedFee;
    if (amountToSplit <= 0) {
      console.error("❌ Insufficient funds for fee.");
      process.exit(1);
    }
    splitAmount = Math.floor(amountToSplit / count);
    if (splitAmount < DUST_THRESHOLD) {
      console.error(`❌ Split amount too small (${(splitAmount / 1e8).toFixed(8)} DOGE), would create dust UTXOs.`);
      process.exit(1);
    }
  }
  const tx = new Transaction().from(spendables);
  for (let i = 0; i < count; i++) {
    tx.to(wallet.address, splitAmount);
  }
  tx.change(wallet.address);
  tx.sign(wallet.privkey);
  await broadcast(tx, wallet, true);
  console.log(`✅ Split complete. TXID: ${tx.hash}`);
}
async function mint() {
  const address = process.argv[3];
  const contentTypeOrFile = process.argv[4];
  const hexData = process.argv[5];
  const delegateTxId = process.argv[6] || "";
  const message = process.argv[7] || "";
  let contentType, data;
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  if (message && Buffer.from(message, "utf8").length > MAX_OP_RETURN_BYTES) {
    console.error(`❌ Message exceeds ${MAX_OP_RETURN_BYTES}-byte OP_RETURN limit.`);
    process.exit(1);
  }
  if (delegateTxId) {
    const delegatePayload = await fetchDelegateMetadata(delegateTxId);
    const meta = delegatePayload.meta || {};
    if (meta.expiration && Date.now() / 1000 > meta.expiration) {
      throw new Error("Delegate has expired");
    }
    let resolvedContentType;
    if (fs.existsSync(contentTypeOrFile)) {
      resolvedContentType = mime.lookup(contentTypeOrFile) || "application/octet-stream";
    } else {
      resolvedContentType = contentTypeOrFile;
    }
    if (meta.content_types && !meta.content_types.includes(resolvedContentType)) {
      throw new Error(`Content type ${resolvedContentType} not allowed by delegate`);
    }
    if (meta.rate_limit || delegatePayload.limit) {
      checkRateLimit(delegateTxId, meta.rate_limit || Infinity, delegatePayload.limit);
    }
    if (meta.geo_ip_restrictions && meta.geo_ip_restrictions[0] !== "none") {
      await checkGeoIp(meta.geo_ip_restrictions);
    }
    if (meta.min_wallet_balance) {
      const spendableUtxos = wallet.utxos.filter((u) => u.type === "spendable");
      const totalSpendable = spendableUtxos.reduce((sum, u) => sum + u.satoshis, 0);
      if (totalSpendable < meta.min_wallet_balance) {
        throw new Error(`Wallet balance (${totalSpendable / 1e8} DOGE) below minimum required (${meta.min_wallet_balance / 1e8} DOGE)`);
      }
    }
    contentType = "delegate";
    data = Buffer.from(delegateTxId, "utf8");
  } else if (fs.existsSync(contentTypeOrFile)) {
    contentType = mime.lookup(contentTypeOrFile) || "application/octet-stream";
    data = fs.readFileSync(contentTypeOrFile);
  } else {
    contentType = contentTypeOrFile;
    data = Buffer.from(hexData, "hex");
  }
  const txs = inscribe(wallet, new Address(address), contentType, data, delegateTxId);
  if (!delegateTxId && message) {
    const finalTx = txs[txs.length - 1];
    const opReturnData = Buffer.from(message, "utf8").slice(0, MAX_OP_RETURN_BYTES);
    const opReturnScript = new Script().add("OP_RETURN").add(opReturnData);
    finalTx.addOutput(new Transaction.Output({ script: opReturnScript, satoshis: 0 }));
  }
  await broadcastAll(txs, wallet);
  console.log("Minted TXID:", txs[txs.length - 1].hash);
}
async function inscribe(wallet, address, contentType, data, delegateTxId = "") {
  const txs = [];
  const privateKey = new PrivateKey(wallet.privkey);
  const publicKey = privateKey.toPublicKey();
  const parts = [];
  const inscription = new Script();
  if (delegateTxId) {
    inscription.add("ord").add(numberToChunk(1)).add(numberToChunk(0)).add(numberToChunk(11)).add(IdToChunk(delegateTxId));
  } else {
    while (data.length) {
      parts.push(data.slice(0, Math.min(MAX_CHUNK_LEN, data.length)));
      data = data.slice(MAX_CHUNK_LEN);
    }
    inscription.add("ord").add(numberToChunk(parts.length)).add(bufferToChunk(contentType));
    parts.forEach((part, n) => {
      inscription.add(numberToChunk(parts.length - n - 1)).add(bufferToChunk(part));
    });
  }
  let p2shInput, lastLock, lastPartial;
  while (inscription.chunks.length) {
    const partial = new Script();
    if (!txs.length) partial.add(inscription.chunks.shift());
    while (partial.toBuffer().length <= MAX_PAYLOAD_LEN && inscription.chunks.length) {
      partial.add(inscription.chunks.shift()).add(inscription.chunks.shift());
    }
    if (partial.toBuffer().length > MAX_PAYLOAD_LEN) {
      inscription.chunks.unshift(partial.chunks.pop());
      inscription.chunks.unshift(partial.chunks.pop());
    }
    const lock = new Script().add(publicKey.toBuffer()).add(Opcode.OP_CHECKSIGVERIFY);
    partial.chunks.forEach(() => lock.add(Opcode.OP_DROP));
    lock.add(Opcode.OP_TRUE);
    const lockHash = Hash.ripemd160(Hash.sha256(lock.toBuffer()));
    const p2sh = new Script().add(Opcode.OP_HASH160).add(lockHash).add(Opcode.OP_EQUAL);
    const p2shOutput = new Transaction.Output({ script: p2sh, satoshis: 100000 });
    const tx = new Transaction();
    if (p2shInput) tx.addInput(p2shInput);
    tx.addOutput(p2shOutput);
    const availableUtxos = wallet.utxos.filter((u) => u.type === "spendable" && !isUTXOBlocked(u.txid, u.vout));
    if (!availableUtxos.length) throw new Error("No spendable UTXOs available for funding");
    await fund(wallet, tx, true);
    if (p2shInput) {
      const signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock);
      const txSig = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])]);
      const unlock = new Script().add(lastPartial).add(txSig).add(lastLock.toBuffer());
      tx.inputs[0].setScript(unlock);
    }
    updateWallet(wallet, tx);
    txs.push(tx);
    p2shInput = new Transaction.Input({ prevTxId: tx.hash, outputIndex: 0, output: tx.outputs[0], script: "" });
    p2shInput.clearSignatures = () => {};
    p2shInput.getSignatures = () => {};
    lastLock = lock;
    lastPartial = partial;
  }
  const finalTx = new Transaction().addInput(p2shInput).to(address, 100000);
  const availableUtxos = wallet.utxos.filter((u) => u.type === "spendable" && !isUTXOBlocked(u.txid, u.vout));
  if (!availableUtxos.length) throw new Error("No spendable UTXOs available for funding final transaction");
  await fund(wallet, finalTx, true);
  const signature = Transaction.sighash.sign(finalTx, privateKey, Signature.SIGHASH_ALL, 0, lastLock);
  const txSig = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])]);
  const unlock = new Script().add(lastPartial).add(txSig).add(lastLock.toBuffer());
  finalTx.inputs[0].setScript(unlock);
  updateWallet(wallet, finalTx);
  txs.push(finalTx);
  return txs;
}
async function broadcastAll(txs, wallet) {
  for (let i = 0; i < txs.length; i++) {
    console.log(`Broadcasting TX ${i + 1}/${txs.length}: ${txs[i].hash}`);
    await broadcast(txs[i], wallet, true);
  }
}
async function dnsDeploy() {
  const namespace = process.argv[4];
  const about = process.argv[5] || "";
  const avatar = process.argv[6] || "";
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const data = JSON5.stringify({ p: "dns", op: "dns", ns: namespace.toLowerCase(), about: about.slice(0, 50), avatar });
  if (Buffer.from(data, "utf8").length > MAX_PAYLOAD_LEN) {
    console.error(`❌ DNS deploy data exceeds ${MAX_PAYLOAD_LEN}-byte limit.`);
    process.exit(1);
  }
  const txs = inscribe(wallet, new Address(wallet.address), "application/json", Buffer.from(data));
  await broadcastAll(txs, wallet);
  console.log("Namespace TXID:", txs[txs.length - 1].hash);
}
async function dnsReg() {
  const name = process.argv[4];
  const avatar = process.argv[5] || "";
  const rev = process.argv[6] || "";
  const relay = process.argv[7] || "";
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  let txs;
  if (!avatar && !rev && !relay) {
    txs = inscribe(wallet, new Address(wallet.address), "text/plain", Buffer.from(name.toLowerCase()));
  } else {
    const data = JSON5.stringify({ p: "dns", op: "reg", name: name.toLowerCase(), avatar, rev, relay });
    txs = inscribe(wallet, new Address(wallet.address), "application/json", Buffer.from(data));
  }
  await broadcastAll(txs, wallet);
  console.log("Name TXID:", txs[txs.length - 1].hash);
}
async function printDunes() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const dunes = [];
  for (const utxo of wallet.utxos) {
    const d = await getDunesForUtxo(`${utxo.txid}:${utxo.vout}`);
    dunes.push(...d);
  }
  console.log("Dunes:", dunes);
}
async function printDuneBalance() {
  const duneName = process.argv[3];
  const address = process.argv[4] || JSON.parse(fs.readFileSync(WALLET_PATH)).address;
  const utxos = await fetchAllUnspentOutputs(address);
  let balance = 0n;
  for (const utxo of utxos) {
    const dunes = await getDunesForUtxo(`${utxo.txid}:${utxo.vout}`);
    dunes.forEach((d) => {
      if (d.dune === duneName) balance += BigInt(d.amount.match(/\d+/)?.[0] || 0);
    });
  }
  console.log(`${balance} ${duneName}`);
}
async function printSafeUtxos() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  let blocked = new Set();
  if (fs.existsSync("utxo.json")) {
    try {
      const memUtxoData = JSON.parse(fs.readFileSync("utxo.json", "utf-8"));
      memUtxoData.forEach((u) => blocked.add(`${u.txid}:${u.vout}`));
    } catch (e) {
      console.warn("Warning: Failed to read utxo.json for mempool filtering.");
    }
  }
  if (fs.existsSync("pending-txs.json")) {
    try {
      const pendingTxs = JSON.parse(fs.readFileSync("pending-txs.json"));
      for (const raw of pendingTxs) {
        try {
          const tx = new Transaction(raw);
          tx.inputs.forEach((input) => {
            const txid = input.prevTxId.toString("hex");
            const vout = input.outputIndex;
            blocked.add(`${txid}:${vout}`);
          });
        } catch (e) {
          console.warn("Error parsing pending-txs.json entry");
        }
      }
    } catch (e) {
      console.warn("Warning: Couldn't parse pending-txs.json");
    }
  }
  const safe = wallet.utxos.filter((u) => {
    const key = `${u.txid}:${u.vout}`;
    return u.type === "spendable" && !blocked.has(key);
  });
  console.log("Safe UTXOs:", safe);
}
async function getDunesForUtxo(outputHash) {
  try {
    const res = await ordApi.get(`/output/${outputHash}`);
    const $ = cheerio.load(res.data);
    const dunes = [];
    $("table tr").each((i, el) => {
      if (i === 0) return;
      const cells = $(el).find("td");
      if (cells.length === 2) {
        dunes.push({ dune: $(cells[0]).text().trim(), amount: $(cells[1]).text().trim().split(" ")[0], utxo: outputHash });
      }
    });
    return dunes;
  } catch {
    return [];
  }
}
async function getDunesForUtxos(hashes) {
  try {
    const response = await ordApi.get(`/outputs/${hashes.join(",")}`);
    return response.data
      .filter((o) => o.dunes.length > 0)
      .map((o) => ({ dunes: o.dunes, utxo: o.txid }));
  } catch (e) {
    console.warn(`Failed to fetch Dunes for UTXOs: ${e.message}`);
    return [];
  }
}
async function getDune(id) {
  try {
    const html = await ordApi.get(`dune/${id}`).then((r) => r.data);
    const $ = cheerio.load(html);
    let duneId, divisibility, limit;
    $("dl dt").each((_, el) => {
      const label = $(el).text().trim();
      const value = $(el).next("dd").text().trim();
      if (label === "id") duneId = value;
      else if (label === "divisibility") divisibility = parseInt(value, 10);
      else if (label === "amount" || label === "limit") limit = parseInt(value.replace(/\D/g, ""), 10);
    });
    if (!duneId || divisibility === undefined || limit === undefined) {
      throw new Error("Failed to parse Dune metadata");
    }
    return { id: duneId, divisibility, limit };
  } catch (e) {
    throw new Error(`Failed to fetch Dune ${id}: ${e.message}`);
  }
}
async function printAllUtxos() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  console.log(`"address": "${wallet.address}",`);
  console.log(`"account": "1st Apestract Doginals Inscriber"`);
  console.log("UTXOs:");
  wallet.utxos.forEach((u, index) => {
    console.log(`  ${index + 1}. TXID: ${u.txid}, Vout: ${u.vout}`);
    console.log(`     Satoshis: ${u.satoshis}`);
    console.log(`     Confirmations: ${u.confirmations || 0}`);
    console.log(`     Type: ${u.type}`);
    console.log(`     Script: ${u.script}`);
    console.log(`     Address: ${u.address}`);
    console.log(`     Account: ${u.account}`);

    // Display inscription metadata
    if (u.data) {
      u.data.forEach((d, i) => {
        console.log(`     Inscription Data ${i + 1}:`);
        if (d.inscriptionId) console.log(`       Inscription ID: ${d.inscriptionId}`);
        if (d.inscriptionNumber) console.log(`       Inscription Number: ${d.inscriptionNumber}`);
        console.log(`       Content Type: ${d.contentType}`);
        console.log(`       Content Length: ${d.contentLength}`);
        if (d.inscribedAt) console.log(`       Inscribed At: ${d.inscribedAt}`);
        if (d.blockHeight) console.log(`       Block Height: ${d.blockHeight}`);
        if (d.inscribedBy) console.log(`       Inscribed By: ${d.inscribedBy}`);
        console.log(`       Owner: ${d.owner}`);
        console.log(`       UTXO: ${d.utxo}`);
        console.log(`       Output Value: ${d.outputValue}`);
        console.log(`       Offset: ${d.offset}`);
        console.log(`       Listed: ${d.listed}`);
        if (d.txs) console.log(`       Transactions: ${d.txs.join(', ')}`);

        // NFT metadata
        if (u.type === "nft" && d.nft) {
          console.log(`       NFT Metadata:`);
          if (d.nft.collectionId) console.log(`         Collection ID: ${d.nft.collectionId}`);
          if (d.nft.itemName) console.log(`         Item Name: ${d.nft.itemName}`);
          if (d.nft.itemId) console.log(`         Item ID: ${d.nft.itemId}`);
          if (d.nft.attributes) console.log(`         Attributes: ${JSON.stringify(d.nft.attributes, null, 2)}`);
        }

        // Dogemap metadata
        if (u.type === "dogemaps" && d.dogemap) {
          console.log(`       Dogemap: ${d.dogemap}.dogemap`);
        }
      });
    }

    // DRC-20 metadata
    if (u.type === "doge20" && u.drc20s) {
      u.drc20s.forEach((d, i) => {
        console.log(`     DRC-20 Data ${i + 1}:`);
        console.log(`       Ticker: ${d.drc20}`);
        console.log(`       Total Amount Available: ${d.totalAmountAvailable}`);
        console.log(`       Transferable Amount: ${d.transferableAmount}`);
        console.log(`       Total: ${d.total}`);
        console.log(`       Total Transferred Into Wallet: ${d.totalTransferedIntoWallet}`);
        console.log(`       Total Transferred Out Of Wallet: ${d.totalTransferedOutOfWallet}`);
      });
    }

    // Dunes metadata
    if (u.type === "dunes" && u.dunes) {
      u.dunes.forEach((d, i) => {
        console.log(`     Dunes Data ${i + 1}:`);
        console.log(`       Dune: ${d.dune}`);
        console.log(`       Amount: ${d.amount}`);
        console.log(`       UTXO: ${d.utxo}`);
      });
    }

    // OP_RETURN messages
    if (u.opReturnMessages && u.opReturnMessages.length > 0) {
      console.log(`     Messages:`);
      u.opReturnMessages.forEach((msg, i) => {
        console.log(`       Message ${i + 1}: ${msg}`);
      });
    }
  });
}
async function fund(wallet, tx, onlySafe = true) {
  let availableUtxos = wallet.utxos.filter((u) => {
    return u.type === "spendable" &&
           !isUTXOBlocked(u.txid, u.vout) &&
           (u.confirmations || 0) > 0;
  });
  if (!availableUtxos.length) {
    throw new Error("❌ No confirmed spendable UTXOs available");
  }
  availableUtxos.sort((a, b) => b.satoshis - a.satoshis);
  const targetAmount = tx.outputs.reduce((sum, output) => sum + output.satoshis, 0);
  const estimatedFeePerByte = Math.max(1, Math.floor((await estimateSmartFee()) / 1000));
  const estimatedTxSize = 180 + (tx.outputs.length * 34);
  let estimatedFee = estimatedTxSize * estimatedFeePerByte;
  let selectedUtxos = [];
  let totalInput = 0;
  for (const utxo of availableUtxos) {
    selectedUtxos.push(utxo);
    totalInput += utxo.satoshis;
    const actualTxSize = 180 + (selectedUtxos.length * 148) + (tx.outputs.length * 34);
    estimatedFee = actualTxSize * estimatedFeePerByte;
    if (totalInput >= targetAmount + estimatedFee + DUST_THRESHOLD) {
      break;
    }
  }
  if (totalInput < targetAmount + estimatedFee) {
    const needed = (targetAmount + estimatedFee) / 1e8;
    const available = totalInput / 1e8;
    throw new Error(`💸 Insufficient funds. Need: ${needed.toFixed(8)} DOGE, Available: ${available.toFixed(8)} DOGE`);
  }
  tx.from(selectedUtxos);
  tx.change(wallet.address);
  tx.sign(wallet.privkey);
  const actualFee = tx.getFee();
  if (actualFee <= 0) throw new Error("Transaction fee cannot be zero");
  console.log(`💰 Transaction fee: ${(actualFee / 1e8).toFixed(8)} DOGE (${selectedUtxos.length} inputs)`);
  if (actualFee > 100000000) {
    console.warn(`⚠️ High fee detected: ${(actualFee / 1e8).toFixed(8)} DOGE`);
  }
}
function isUTXOBlocked(txid, vout) {
  if (!fs.existsSync("utxo.json")) return false;
  try {
    const utxos = JSON.parse(fs.readFileSync("utxo.json"));
    return utxos.some((u) => u.txid === txid && (u.vout === vout || u.vout === undefined));
  } catch {
    return false;
  }
}
async function broadcast(tx, wallet, retry = true) {
  const req = {
    jsonrpc: "1.0",
    id: "doginals",
    method: "sendrawtransaction",
    params: [tx.toString()]
  };
  if (process.env.DYNAMIC_FEES === "true") {
    const metrics = getMempoolMetrics();
    const DEFAULT_FEE = parseInt(process.env.FEE_PER_KB) || 100000000;
    if (metrics) {
      if (metrics.txCount > 10000 || metrics.avgFeeRate > 5) {
        console.warn("⛔ Mempool congestion detected:");
        console.warn(` → ${metrics.txCount} txs in mempool, avg fee rate: ${metrics.avgFeeRate} sat/vB`);
        console.warn("⏳ Delaying broadcast by 30s to avoid rejection...");
        await new Promise((r) => setTimeout(r, 30000));
      }
      if (metrics.avgFeeRate > 8) {
        const feeRate = Math.ceil(metrics.avgFeeRate + 1);
        console.warn(`⚙️ Increasing FEE_PER_KB to ${feeRate} due to congestion`);
        updateEnvFeeRate(feeRate);
        Transaction.FEE_PER_KB = feeRate;
      } else if (metrics.avgFeeRate < 3 && Transaction.FEE_PER_KB > DEFAULT_FEE) {
        console.log(`✅ Mempool cleared. Restoring FEE_PER_KB to default: ${DEFAULT_FEE}`);
        updateEnvFeeRate(DEFAULT_FEE);
        Transaction.FEE_PER_KB = DEFAULT_FEE;
      }
    }
  }
  let res;
  while (true) {
    try {
      res = await axios.post(RPC_URL, req, { auth: RPC_AUTH });
      break;
    } catch (e) {
      if (!retry) throw e;
      const msg = e.response?.data?.error?.message;
      if (msg?.includes("too-long-mempool-chain")) {
        console.warn("🔁 Retrying due to too-long-mempool-chain...");
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        throw e;
      }
    }
  }
  updateWallet(wallet, tx);
  fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
  return res.data.result;
}
function updateWallet(wallet, tx) {
  wallet.utxos = wallet.utxos.filter((u) => !tx.inputs.some((i) => i.prevTxId.toString("hex") === u.txid && i.outputIndex === u.vout));
  tx.outputs.forEach((o, i) => {
    if (o.script.toAddress()?.toString() === wallet.address) {
      wallet.utxos.push({ txid: tx.hash, vout: i, script: o.script.toHex(), satoshis: o.satoshis, type: "spendable" });
    }
  });
}
async function fetchAllUnspentOutputs(walletAddress) {
  const response = await ordApi.get(`utxos/balance/${walletAddress}?show_all=true&show_unsafe=true`);
  return (response.data.utxos || []).map((o) => ({ txid: o.txid, vout: o.vout, script: o.script, satoshis: Number(o.shibes) }));
}
async function fetchParentUtxo(parentId) {
  const [txid, i] = parentId.split("i");
  const vout = parseInt(i, 10);
  const raw = await axios.post(RPC_URL, { jsonrpc: "1.0", id: "doginals", method: "getrawtransaction", params: [txid, true] }, { auth: RPC_AUTH });
  const output = raw.data.result.vout[vout];
  return { txid, vout, script: output.scriptPubKey.hex, satoshis: Math.round(output.value * 1e8) };
}
async function getBlockCount() {
  try {
    const response = await axios.post(RPC_URL, {
      jsonrpc: "1.0",
      id: "doginals",
      method: "getblockcount",
      params: [],
    }, { auth: RPC_AUTH });
    return response.data.result;
  } catch (e) {
    throw new Error(`Failed to fetch block count: ${e.message}`);
  }
}
function parseDuneId(id, claim = false) {
  const [height, index] = id.includes(":") ? id.split(":") : id.split("/");
  let duneId = (BigInt(height) << 16n) | BigInt(index);
  if (claim) {
    const CLAIM_BIT = 1n << 48n;
    duneId |= CLAIM_BIT;
  }
  return duneId;
}
async function isDune(txid) {
  try {
    const res = await ordApi.get(`/output/${txid}:0`);
    const $ = cheerio.load(res.data);
    return $("table tr").length > 1;
  } catch {
    return false;
  }
}
function server() {
  const app = express();
  const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;
  app.get("/tx/:txid", async (req, res) => {
    try {
      const inscription = await extract(req.params.txid);
      if (!inscription) return res.status(404).send("Inscription not found");
      res.setHeader("Content-Type", inscription.contentType);
      res.send(inscription.data);
    } catch (e) {
      res.status(500).send(`Error fetching inscription: ${e.message}`);
    }
  });
  app.listen(port, () => {
    console.log(`So Listening on Such port ${port}`);
    console.log();
    console.log(`Example:`);
    console.log(`http://localhost:${port}/tx/15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e`);
  });
}
main().catch((e) => {
  const reason = e.response?.data?.error?.message || e.message;
  console.error(`Error: ${reason}`);
  process.exit(1);
});
