import { PublicKey } from "@solana/web3.js";

export const COOKIE_RPC = "https://rpc.cookiescan.io";
export const COOKIE_WS = "https://wss.cookiescan.io";
export const COOKIE_EXPLORER = "https://cookiescan.io";
export const COOKIE_GENESIS_HASH = "9wDaBRDgArEUpvhHxGguNkwozsZh4UpGZB9o2EoEcBB2";
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function txUrl(signature: string) {
  return COOKIE_EXPLORER + "/tx/" + signature;
}

export function addressUrl(address: string) {
  return COOKIE_EXPLORER + "/address/" + address;
}

export function short(value: string, n = 6) {
  return value.length > n * 2 + 1 ? value.slice(0, n) + "…" + value.slice(-n) : value;
}
