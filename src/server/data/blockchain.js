/*
 * Copyright 2018-2020 TON DEV SOLUTIONS LTD.
 *
 * Licensed under the SOFTWARE EVALUATION License (the "License"); you may not use
 * this file except in compliance with the License.  You may obtain a copy of the
 * License at:
 *
 * http://www.ton.dev/licenses
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific TON DEV software governing permissions and
 * limitations under the License.
 */

// @flow

import { Counterparty } from "../graphql/counterparties";
import type { QDataOptions } from './data';
import QData from './data';
import { QDataCollection, QDataScope } from './collection';
import {
    Account,
    Block,
    BlockSignatures,
    Message,
    Transaction,
    Zerostate,
} from '../graphql/resolvers-generated';
import { sortedIndex } from './data-provider';

export const INDEXES = {
    blocks: {
        indexes: [
            sortedIndex(['seq_no', 'gen_utime']),
            sortedIndex(['gen_utime']),
            sortedIndex(['workchain_id', 'shard', 'seq_no']),
            sortedIndex(['workchain_id', 'shard', 'gen_utime']),
            sortedIndex(['workchain_id', 'seq_no']),
            sortedIndex(['workchain_id', 'gen_utime']),
            sortedIndex(['master.min_shard_gen_utime']),
            sortedIndex(['prev_ref.root_hash', '_key']),
            sortedIndex(['prev_alt_ref.root_hash', '_key']),
        ],
    },
    accounts: {
        indexes: [
            sortedIndex(['last_trans_lt']),
            sortedIndex(['balance']),
        ],
    },
    messages: {
        indexes: [
            sortedIndex(['block_id']),
            sortedIndex(['value', 'created_at']),
            sortedIndex(['src', 'value', 'created_at']),
            sortedIndex(['dst', 'value', 'created_at']),
            sortedIndex(['src', 'created_at']),
            sortedIndex(['dst', 'created_at']),
            sortedIndex(['created_lt']),
            sortedIndex(['created_at']),
        ],
    },
    transactions: {
        indexes: [
            sortedIndex(['block_id']),
            sortedIndex(['in_msg']),
            sortedIndex(['out_msgs[*]']),
            sortedIndex(['account_addr', 'now']),
            sortedIndex(['now']),
            sortedIndex(['lt']),
            sortedIndex(['account_addr', 'orig_status', 'end_status']),
            sortedIndex(['now', 'account_addr', 'lt']),
        ],
    },
    blocks_signatures: {
        indexes: [
            sortedIndex(['signatures[*].node_id', 'gen_utime']),
        ],
    },
    zerostates: {
        indexes: [],
    },
    counterparties: {
        indexes: [],
    },
};


Object.values(INDEXES).forEach((collection: any) => {
    collection.indexes = collection.indexes.concat({ fields: ['_key'] });
});

export type CollectionLatency = {
    maxTime: number,
    nextUpdateTime: number,
    latency: number,
};

export type Latency = {
    blocks: CollectionLatency,
    messages: CollectionLatency,
    transactions: CollectionLatency,
    nextUpdateTime: number,
    latency: number,
    lastBlockTime: number,
};

export default class QBlockchainData extends QData {
    transactions: QDataCollection;
    messages: QDataCollection;
    accounts: QDataCollection;
    blocks: QDataCollection;
    blocks_signatures: QDataCollection;
    zerostates: QDataCollection;
    counterparties: QDataCollection;

    latency: Latency;

    constructor(options: QDataOptions) {
        super(options);
        const add = (name, type, mutable) => {
            return this.addCollection(name, type, mutable, INDEXES[name].indexes);
        };
        this.accounts = add('accounts', Account, QDataScope.mutable);
        this.transactions = add('transactions', Transaction, QDataScope.immutable);
        this.messages = add('messages', Message, QDataScope.immutable);
        this.blocks = add('blocks', Block, QDataScope.immutable);
        this.blocks_signatures = add('blocks_signatures', BlockSignatures, QDataScope.immutable);
        this.zerostates = add('zerostates', Zerostate, QDataScope.immutable);
        this.counterparties = add('counterparties', Counterparty, QDataScope.counterparties);

        this.latency = {
            blocks: {
                maxTime: 0,
                nextUpdateTime: 0,
                latency: 0,
            },
            messages: {
                maxTime: 0,
                nextUpdateTime: 0,
                latency: 0,
            },
            transactions: {
                maxTime: 0,
                nextUpdateTime: 0,
                latency: 0,
            },
            nextUpdateTime: 0,
            latency: 0,
            lastBlockTime: 0,
        }

        this.blocks.docInsertOrUpdate.on("doc", async (block) => {
            this.updateLatency(this.latency.blocks, block.gen_utime);
        });
        this.transactions.docInsertOrUpdate.on("doc", async (tr) => {
            this.updateLatency(this.latency.transactions, tr.now);
        });
        this.messages.docInsertOrUpdate.on("doc", async (msg) => {
            this.updateLatency(this.latency.transactions, msg.created_at);
        });
    }

    updateLatency(latency: CollectionLatency, timeInSeconds?: ?number) {
        if (this.updateCollectionLatency(latency, timeInSeconds)) {
            this.updateLatencySummary();
        }
    }

    updateCollectionLatency(latency: CollectionLatency, timeInSeconds?: ?number): boolean {
        if (timeInSeconds === undefined || timeInSeconds === null || timeInSeconds === 0) {
            return false;
        }
        const time = timeInSeconds * 1000;
        const now = Date.now();
        if (time > latency.maxTime) {
            latency.maxTime = time;
        }
        latency.nextUpdateTime = now + 30000; // LATENCY_UPDATE_FREQUENCY
        latency.latency = Math.max(0, now - latency.maxTime);
        return true;
    }

    updateLatencySummary() {
        const { blocks, messages, transactions } = this.latency;
        this.latency.nextUpdateTime = Math.min(
            blocks.nextUpdateTime,
            messages.nextUpdateTime,
            transactions.nextUpdateTime,
        );
        this.latency.latency = Math.max(
            blocks.latency,
            messages.latency,
            transactions.latency,
        );
        this.latency.lastBlockTime = blocks.maxTime;
    }

    async updateMaxTime(latency: CollectionLatency, collection: QDataCollection, field: string): Promise<boolean> {
        if (Date.now() <= latency.nextUpdateTime) {
            return false;
        }
        const maxTime = (await collection.provider.query(
            `FOR d IN ${collection.name} SORT d.${field} LIMIT 1 RETURN { maxTime: d.${field} }`,
            {}, [{ path: field, direction: "DESC" }]
        ))[0].maxTime;
        return this.updateCollectionLatency(latency, maxTime);

    }

    async getLatency(): Promise<Latency> {
        const latency = this.latency;
        if (Date.now() > latency.nextUpdateTime) {
            let hasUpdates = await this.updateMaxTime(latency.blocks, this.blocks, "gen_utime");
            if (await this.updateMaxTime(latency.messages, this.messages, "created_at")) {
                hasUpdates = true;
            }
            if (await this.updateMaxTime(latency.transactions, this.transactions, "now")) {
                hasUpdates = true;
            }
            if (hasUpdates) {
                this.updateLatencySummary();
            }
        }
        return latency;
    }
}
