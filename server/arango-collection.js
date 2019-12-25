/*
 * Copyright 2018-2019 TON DEV SOLUTIONS LTD.
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

import { $$asyncIterator } from 'iterall';
import { Database, DocumentCollection } from "arangojs";
import QLogs from "./logs";
import type { QLog } from "./logs";
import type { QType } from "./q-types";
import { QParams } from "./q-types";
import { Tracer } from "./tracer";

type CollectionWaitFor = {
    filter: any,
    onInsertOrUpdate: (doc: any) => void,
}

type OrderBy = {
    path: string,
    direction: string,
}

type Query = {
    query: string,
    bindVars: { [string]: any },
}

export async function wrap<R>(log: QLog, op: string, args: any, fetch: () => Promise<R>) {
    try {
        return await fetch();
    } catch (err) {
        const error = {
            message: err.message || err.ArangoError || err.toString(),
            code: err.code
        };
        log.error('FAILED', op, args, error.message);
        throw error;
    }
}

class RegistryMap<T> {
    name: string;
    items: Map<number, T>;
    lastId: number;

    constructor(name: string) {
        this.name = name;
        this.lastId = 0;
        this.items = new Map();
    }

    add(item: T): number {
        let id = this.lastId;
        do {
            id = id < Number.MAX_SAFE_INTEGER ? id + 1 : 1;
        } while (this.items.has(id));
        this.lastId = id;
        this.items.set(id, item);
        return id;
    }

    remove(id: number) {
        if (!this.items.delete(id)) {
            console.error(`Failed to remove ${this.name}: item with id [${id}] does not exists`);
        }
    }

    entries(): [number, T][] {
        return [...this.items.entries()];
    }

    values(): T[] {
        return [...this.items.values()];
    }
}

export type FieldSelection = {
    name: string,
    selection: FieldSelection[],
}

function parseSelectionSet(selectionSet: any, returnFieldSelection: string): FieldSelection[] {
    const fields: FieldSelection[] = [];
    const selections = selectionSet && selectionSet.selections;
    if (selections) {
        for (const item of selections) {
            const name = (item.name && item.name.value) || '';
            if (name) {
                const field: FieldSelection = {
                    name,
                    selection: parseSelectionSet(item.selectionSet, ''),
                };
                if (returnFieldSelection !== '' && field.name === returnFieldSelection) {
                    return field.selection;
                }
                fields.push(field);
            }
        }
    }
    return fields;
}

function selectFields(doc: any, selection: FieldSelection[]): any {
    const selected: any = {};
    if (doc._key) {
        selected._key = doc._key;
    }
    for (const item of selection) {
        const value = doc[item.name];
        if (value !== undefined) {
            selected[item.name] = item.selection.length > 0 ? selectFields(value, item.selection) : value;
        }
    }
    return selected;
}

//$FlowFixMe
export class CollectionSubscription implements AsyncIterator<any> {
    collection: Collection;
    id: number;
    filter: any;
    selection: FieldSelection[];
    eventCount: number;
    pullQueue: ((value: any) => void)[];
    pushQueue: any[];
    running: boolean;

    constructor(collection: Collection, filter: any, selection: FieldSelection[]) {
        this.collection = collection;
        this.filter = filter;
        this.selection = selection;
        this.eventCount = 0;
        this.pullQueue = [];
        this.pushQueue = [];
        this.running = true;
        this.id = collection.subscriptions.add(this);
    }

    onDocumentInsertOrUpdate(doc: any) {
        if (!this.isQueueOverflow() && this.collection.docType.test(null, doc, this.filter)) {

            this.pushValue({ [this.collection.name]: selectFields(doc, this.selection) });
        }
    }

    isQueueOverflow(): boolean {
        return this.getQueueSize() >= 10;
    }

    getQueueSize(): number {
        return this.pushQueue.length + this.pullQueue.length;
    }

    pushValue(value: any) {
        const queueSize = this.getQueueSize();
        if (queueSize > this.collection.maxQueueSize) {
            this.collection.maxQueueSize = queueSize;
        }
        this.eventCount += 1;
        if (this.pullQueue.length !== 0) {
            this.pullQueue.shift()(this.running
                ? { value, done: false }
                : { value: undefined, done: true },
            );
        } else {
            this.pushQueue.push(value);
        }
    }

    async next(): Promise<any> {
        return new Promise((resolve) => {
            if (this.pushQueue.length !== 0) {
                resolve(this.running
                    ? { value: this.pushQueue.shift(), done: false }
                    : { value: undefined, done: true },
                );
            } else {
                this.pullQueue.push(resolve);
            }
        });
    }

    async return(): Promise<any> {
        this.collection.subscriptions.remove(this.id);
        await this.emptyQueue();
        return { value: undefined, done: true };
    }

    async throw(error?: any): Promise<any> {
        this.collection.subscriptions.remove(this.id);
        await this.emptyQueue();
        return Promise.reject(error);
    }

    //$FlowFixMe
    [$$asyncIterator]() {
        return this;
    }

    async emptyQueue() {
        if (this.running) {
            this.running = false;
            this.pullQueue.forEach(resolve => resolve({ value: undefined, done: true }));
            this.pullQueue = [];
            this.pushQueue = [];
        }
    }

}


export class Collection {
    name: string;
    docType: QType;

    log: QLog;
    changeLog: ChangeLog;
    tracer: Tracer;
    db: Database;

    subscriptions: RegistryMap<CollectionSubscription>;
    waitFor: RegistryMap<CollectionWaitFor>;

    maxQueueSize: number;

    constructor(
        name: string,
        docType: QType,
        logs: QLogs,
        changeLog: ChangeLog,
        tracer: Tracer,
        db: Database,
    ) {
        this.name = name;
        this.docType = docType;

        this.log = logs.create(name);
        this.changeLog = changeLog;
        this.tracer = tracer;
        this.db = db;

        this.subscriptions = new RegistryMap<CollectionSubscription>(`${name} subscriptions`);
        this.waitFor = new RegistryMap<CollectionWaitFor>(`${name} waitFor`);

        this.maxQueueSize = 0;
    }

    // Subscriptions

    onDocumentInsertOrUpdate(doc: any) {
        for (const { filter, onInsertOrUpdate } of this.waitFor.values()) {
            if (this.docType.test(null, doc, filter)) {
                onInsertOrUpdate(doc);
            }
        }
        for (const subscription: CollectionSubscription of this.subscriptions.values()) {
            subscription.onDocumentInsertOrUpdate(doc);
        }
    }

    subscriptionResolver() {
        return {
            subscribe: (_: any, args: { filter: any }, _context: any, info: any) => {
                return new CollectionSubscription(
                    this,
                    args.filter || {},
                    parseSelectionSet(info.operation.selectionSet, this.name),
                );
            },
        }
    }

    // Queries

    queryResolver() {
        return async (parent: any, args: any, context: any) => wrap(this.log, 'QUERY', args, async () => {
            this.log.debug('QUERY', args);
            const filter = args.filter || {};
            const orderBy: OrderBy[] = args.orderBy || [];
            const limit: number = args.limit || 50;
            const timeout = (Number(args.timeout) || 0) * 1000;
            const q = this.genQuery(filter, orderBy, limit);

            const span = await this.tracer.startSpanLog(context, 'arango.js:fetchDocs', 'new query', args);
            try {
                if (timeout > 0) {
                    return await this.queryWaitFor(q, filter, timeout);
                } else {
                    return await this.query(q);
                }
            } finally {
                await span.finish();
            }
        });
    }

    async query(q: Query): Promise<any> {
        const cursor = await this.db.query(q);
        return await cursor.all();
    }


    async queryWaitFor(q: Query, filter: any, timeout: number): Promise<any> {
        let waitForId: ?number = null;
        try {
            const onQuery = new Promise((resolve, reject) => {
                this.query(q).then((docs) => {
                    if (docs.length > 0) {
                        resolve(docs)
                    }
                }, reject);
            });
            const onChangesFeed = new Promise((resolve) => {
                waitForId = this.waitFor.add({
                    filter,
                    onInsertOrUpdate(doc) {
                        resolve([doc])
                    },
                });
            });
            const onTimeout = new Promise((resolve) => {
                setTimeout(() => resolve([]), timeout);
            });
            return await Promise.race([
                onQuery,
                onChangesFeed,
                onTimeout,
            ]);
        } finally {
            if (waitForId !== null && waitForId !== undefined) {
                this.waitFor.remove(waitForId);
            }
        }
    }


    genQuery(filter: any, orderBy: OrderBy[], limit: number): Query {
        const params = new QParams();
        const filterSection = Object.keys(filter).length > 0
            ? `FILTER ${this.docType.ql(params, 'doc', filter)}`
            : '';
        const orderByQl = orderBy
            .map((field) => {
                const direction = (field.direction && field.direction.toLowerCase() === 'desc')
                    ? ' DESC'
                    : '';
                return `doc.${field.path.replace(/\bid\b/gi, '_key')}${direction}`;
            })
            .join(', ');

        const sortSection = orderByQl !== '' ? `SORT ${orderByQl}` : '';
        const limitQl = Math.min(limit, 50);
        const limitSection = `LIMIT ${limitQl}`;

        const query = `
            FOR doc IN ${this.name}
            ${filterSection}
            ${sortSection}
            ${limitSection}
            RETURN doc`;
        return {
            query,
            bindVars: params.values
        };
    }

    dbCollection(): DocumentCollection {
        return this.db.collection(this.name);
    }

    async fetchDocByKey(key: string): Promise<any> {
        if (!key) {
            return Promise.resolve(null);
        }
        return wrap(this.log, 'FETCH_DOC_BY_KEY', key, async () => {
            return this.dbCollection().document(key, true);
        });
    }

    async fetchDocsByKeys(keys: string[]): Promise<any[]> {
        if (!keys || keys.length === 0) {
            return Promise.resolve([]);
        }
        return Promise.all(keys.map(key => this.fetchDocByKey(key)));
    }
}

export class ChangeLog {
    enabled: boolean;
    records: Map<string, number[]>;

    constructor() {
        this.enabled = false;
        this.records = new Map();
    }

    clear() {
        this.records.clear();
    }

    log(id: string, time: number) {
        if (!this.enabled) {
            return;
        }
        const existing = this.records.get(id);
        if (existing) {
            existing.push(time);
        } else {
            this.records.set(id, [time]);
        }
    }

    get(id: string): number[] {
        return this.records.get(id) || [];
    }
}