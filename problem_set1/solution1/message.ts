import { canonicalize } from "npm:json-canonicalize";
import { Result } from "./utility.ts";

export function canonicalizeMessage(message: string) {
    return canonicalize(message);
}

export function parseMessage(
    message: Uint8Array,
): Result<object, string> {
    const messageString = new TextDecoder().decode(message);
    console.log(`Received message: ${messageString}`);

    // Parse JSON message
    let parsedMessage: object;
    try {
        parsedMessage = JSON.parse(messageString);
        return { success: true, value: parsedMessage };
    } catch (_err) {
        return { success: false, error: "Message object is not valid JSON" };
    }
}

export function convertMessage(message: object): Result<Message, string> {
    if (!('type' in message)) {
        return { success: false, error: "Message JSON is not in valid format" };
    }

    const msg = message as any;
    const type = msg.type;
    
    // Define validation rules for each message type
    const validators: Record<string, (m: any) => boolean> = {
        hello: m => typeof m.version === 'string' && typeof m.agent === 'string',
        error: m => typeof m.name === 'string' && typeof m.description === 'string',
        getpeers: m => Object.keys(m).length === 1,
        getmempool: m => Object.keys(m).length === 1,
        getchaintip: m => Object.keys(m).length === 1,
        peers: m => Array.isArray(m.peers) && m.peers.every((peer: string) => typeof peer === 'string'),
        getobject: m => typeof m.objectid === 'string',
        ihaveobject: m => typeof m.objectid === 'string',
        object: m => typeof m.object === 'object' && m.object !== null,
        mempool: m => Array.isArray(m.txids) && m.txids.every((txid: string) => typeof txid === 'string'),
        chaintip: m => typeof m.blockid === 'string'
    };

    const validator = validators[type];
    if (validator && validator(msg)) {
        return { success: true, value: msg as Message };
    }

    return { success: false, error: "Message JSON is not in valid format" };
}

export type Message =
    | MessageHello
    | MessageError
    | MessageGetPeers
    | MessagePeers
    | MessageGetObject
    | MessageIHaveObject
    | MessageObject
    | MessageGetMempool
    | MessageMempool
    | MessageGetChainTip
    | MessageChainTip;

type MessageHello = {
    /**
     * @param type - The type of the message
     * @param version - The version of the protocol
     * @param agent - The agent string identifying the software
     *
     * Example:
     * {
     *   "type": "hello",
     *   "version": "0.10.0",
     *   "agent": "Marabu-Core Client 0.10"
     * }
     */
    type: "hello";
    version: string;
    agent: string;
};

type MessageError = {
    /**
     * Error types and their descriptions:
     *
     * @error INTERNAL_ERROR - Internal system error occurred during processing
     * @error INVALID_FORMAT - Message received does not conform to expected format
     * @error UNKNOWN_OBJECT - Requested object is not recognized by the node
     * @error UNFINDABLE_OBJECT - Object cannot be located within the node's network
     * @error INVALID_HANDSHAKE - Protocol violation: messages received before valid handshake
     * @error INVALID_TX_OUTPOINT - Transaction contains an invalid outpoint index
     * @error INVALID_TX_SIGNATURE - Transaction contains an invalid cryptographic signature
     * @error INVALID_TX_CONSERVATION - Transaction violates conservation law constraints
     * @error INVALID_BLOCK_COINBASE - Block contains an invalid coinbase transaction
     * @error INVALID_BLOCK_TIMESTAMP - Block contains an invalid timestamp
     * @error INVALID_BLOCK_POW - Block contains invalid proof-of-work
     * @error INVALID_GENESIS - Block incorrectly claims to be genesis block
     */
    type: "error";
    name:
        | "INTERNAL_ERROR"
        | "INVALID_FORMAT"
        | "UNKNOWN_OBJECT"
        | "UNFINDABLE_OBJECT"
        | "INVALID_HANDSHAKE"
        | "INVALID_TX_OUTPOINT"
        | "INVALID_TX_SIGNATURE"
        | "INVALID_TX_CONSERVATION"
        | "INVALID_BLOCK_COINBASE"
        | "INVALID_BLOCK_TIMESTAMP"
        | "INVALID_BLOCK_POW"
        | "INVALID_GENESIS";
    description: string;
};

type MessageGetPeers = {
    /**
     * @param type - The type of the message
     *
     * Example:
     * {
     *   "type": "getpeers"
     * }
     */
    type: "getpeers";
};

type MessagePeers = {
    /**
     * @param type - The type of the message
     * @param peers - An array of peer strings
     *
     * Example:
     * {
     *   "type": "peers",
     *   "peers": [
     *     "dionyziz.com:18018",
     *     "138.197.191.170:18018",
     *     "[fe80::f03c:91ff:fe2c:5a79]:18018"
     *   ]
     * }
     */
    type: "peers";
    peers: string[];
};

type MessageGetObject = {
    /**
     * @param type - The type of the message
     * @param objectid - The ID of the object to get
     *
     * Example:
     * {
     *   "type": "getobject",
     *   "objectid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
     * }
     */
    type: "getobject";
    objectid: string;
};

type MessageIHaveObject = {
    /**
     * @param type - The type of the message
     * @param objectid - The ID of the object to announce
     *
     * Example:
     * {
     *   "type": "ihaveobject",
     *   "objectid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
     * }
     */
    type: "ihaveobject";
    objectid: string;
};

type MessageObject = {
    /**
     * @param type - The type of the message
     * @param object - The object to announce
     *
     * Example:
     * {
     *   "type": "object",
     *   "object": {
     *     "T": "00000000abc00000000000000000000000000000000000000000000000000000",
     *     "created": 1671148800,
     *     "miner": "Marabu Bounty Hunter",
     *     "nonce": "15551b5116783ace79cf19d95cca707a94f48e4cc69f3db32f41081dab3e6641",
     *     "note": "First block on genesis, 50 bu reward",
     *     "previd": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2",
     *     "txids": [
     *       "8265faf623dfbcb17528fcd2e67fdf78de791ed4c7c60480e8cd21c6cdc8bcd4"
     *     ],
     *     "type": "block"
     *   }
     * }
     */
    type: "object";
    object: {
        T: string;
        created: number;
        miner: string;
        nonce: string;
        note: string;
        previd: string;
        txids: string[];
        type: string;
    };
};

type MessageGetMempool = {
    /**
     * @param type - The type of the message
     *
     * Example:
     * {
     *   "type": "getmempool"
     * }
     */
    type: "getmempool";
};

type MessageMempool = {
    /**
     * @param type - The type of the message
     * @param txids - An array of transaction IDs
     *
     * Example:
     * {
     *   "type": "mempool",
     *   "txids": [
     *     "8265faf623dfbcb17528fcd2e67fdf78de791ed4c7c60480e8cd21c6cdc8bcd4"
     *   ]
     * }
     */
    type: "mempool";
    txids: string[];
};

type MessageGetChainTip = {
    /**
     * @param type - The type of the message
     *
     * Example:
     * {
     *   "type": "getchaintip"
     * }
     */
    type: "getchaintip";
};

type MessageChainTip = {
    /**
     * @param type - The type of the message
     * @param blockid - The ID of the chain tip
     *
     * Example:
     * {
     *   "type": "chaintip",
     *   "blockid": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2"
     * }
     */
    type: "chaintip";
    blockid: string;
};
