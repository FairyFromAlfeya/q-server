import { QRequestContext } from "../../request"
import { QTraceSpan } from "../../tracing"
import { QError, required } from "../../utils"

import {
    BlockchainQueryMaster_Seq_No_RangeArgs,
    Resolvers,
} from "./resolvers-types-generated"
import {
    resolve_account,
    resolve_account_transactions,
    resolve_key_blocks,
    resolve_blockchain_blocks,
    resolve_account_messages,
    resolve_blockchain_transactions,
    resolve_block,
    resolve_transaction,
    resolve_message,
    resolve_block_by_seq_no,
} from "./fetchers"

function parseMasterSeqNo(chain_order: string) {
    const length = parseInt(chain_order[0], 16) + 1
    return parseInt(chain_order.slice(1, length + 1), 16)
}

async function resolve_maser_seq_no_range(
    args: BlockchainQueryMaster_Seq_No_RangeArgs,
    context: QRequestContext,
    traceSpan: QTraceSpan,
) {
    if (args.time_start && args.time_end && args.time_start > args.time_end) {
        throw QError.invalidQuery(
            "time_start should not be greater than time_end",
        )
    }

    // For the start we are:
    // - searching the closest master block at or before time_start - all later blocks will have bigger chain_order
    // - searching the minimum chain_order as a backup plan
    // For the end we are:
    // - trying to reduce amount of blocks to process via end_query_limiter
    // - getting the max chain_order for a blocks at or before time_end
    const text = `
        // ArangoDB most likely will execute all of the queries, but we will give it a chance to optimize
        LET end_query_limiter = @time_end
            ? /* min_gen_utime_for_range_ending_after_time_end */ (
                FOR b IN blocks 
                FILTER b.workchain_id == -1 && b.gen_utime > @time_end 
                SORT b.gen_utime ASC 
                LIMIT 1 
                RETURN MIN(b.master.shard_hashes[*].descr.gen_utime)
            )[0]
            : null
            
        LET end_query_limiter2 = @time_end && (end_query_limiter > @time_end || end_query_limiter == null)
            ? /* min_gen_utime_for_range_ending_right_before_time_end */ (
                FOR b IN blocks 
                FILTER b.workchain_id == -1 && b.gen_utime <= @time_end 
                SORT b.gen_utime DESC 
                LIMIT 1 
                RETURN MIN(b.master.shard_hashes[*].descr.gen_utime)
            )[0]
            : end_query_limiter
            
        LET end_query_limiter3 = end_query_limiter2 || 1
            
        RETURN {
            _key: UUID(),
            first: @time_start ? (FOR b IN blocks SORT b.chain_order ASC LIMIT 1 RETURN b.chain_order)[0] : null,
            start: @time_start ? (FOR b IN blocks FILTER b.workchain_id == -1 && b.gen_utime <= @time_start SORT b.gen_utime DESC LIMIT 1 RETURN b.chain_order)[0] : null,
            end: @time_end ? MAX(FOR b IN blocks FILTER b.gen_utime >= end_query_limiter3 && b.gen_utime <= @time_end SORT b.gen_utime DESC RETURN b.chain_order) : null
        }
    ` // UUID is a hack to bypass QDataCombiner deduplication
    const vars: Record<string, unknown> = {
        time_start: args.time_start ?? null,
        time_end: args.time_end ?? null,
    }
    const result = (await context.services.data.query(
        required(context.services.data.blocks.provider),
        {
            text,
            vars,
            orderBy: [],
            request: context,
            traceSpan,
        },
    )) as { first: string | null; start: string | null; end: string | null }[]

    let first: string | null = null
    let start: string | null = null
    let end: string | null = null
    for (const r of result) {
        if (r.first && (!first || r.first < first)) {
            first = r.first
        }
        if (r.start && (!start || r.start > start)) {
            start = r.start
        }
        if (r.end && (!end || r.end > end)) {
            end = r.end
        }
    }
    if (!start && first) {
        start = first
    }
    if (args.time_end && !end) {
        start = null
    }
    if (args.time_start && !start) {
        end = null
    }

    // reliable boundary
    const reliable =
        await context.services.data.getReliableChainOrderUpperBoundary(context)
    if (reliable.boundary == "") {
        throw QError.create(500, "Could not determine reliable upper boundary")
    }

    return {
        start: start ? parseMasterSeqNo(start) : null,
        end: end
            ? Math.min(
                  parseMasterSeqNo(end) + 1,
                  parseMasterSeqNo(reliable.boundary),
              )
            : null,
    }
}

export const resolvers: Resolvers<QRequestContext> = {
    Query: {
        blockchain: () => ({}),
    },
    BlockchainQuery: {
        account: async (_parent, args, context) => {
            const addressWithoutPrefix = args.address.split(":")[1]
            if (
                addressWithoutPrefix === undefined ||
                addressWithoutPrefix.length !== 64
            ) {
                throw QError.invalidQuery("Invalid account address")
            }
            const restrictToAccounts = (await context.requireGrantedAccess({}))
                .restrictToAccounts
            if (
                restrictToAccounts.length != 0 &&
                !restrictToAccounts.includes(args.address)
            ) {
                throw QError.invalidQuery("This account address is not allowed")
            }
            return {
                address: args.address,
            }
        },
        block: async (_parent, args, context, info) => {
            return context.trace("blockchain-block", async traceSpan => {
                return resolve_block(args.hash, context, info, traceSpan)
            })
        },
        block_by_seq_no: async (_parent, args, context, info) => {
            return context.trace(
                "blockchain-block-by-seq-no",
                async traceSpan => {
                    return resolve_block_by_seq_no(
                        args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
        transaction: async (_parent, args, context, info) => {
            return context.trace("blockchain-transaction", async traceSpan => {
                return resolve_transaction(args.hash, context, info, traceSpan)
            })
        },
        message: async (_parent, args, context, info) => {
            return context.trace("blockchain-message", async traceSpan => {
                return resolve_message(args.hash, context, info, traceSpan)
            })
        },
        master_seq_no_range: (_parent, args, context) => {
            return context.trace(
                "blockchain-master_seq_no_range",
                async traceSpan => {
                    return await resolve_maser_seq_no_range(
                        args,
                        context,
                        traceSpan,
                    )
                },
            )
        },
        key_blocks: async (_parent, args, context, info) => {
            return context.trace(
                "blockchain-resolve_key_blocks",
                async traceSpan => {
                    return await resolve_key_blocks(
                        args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
        workchain_blocks: async (_parent, args, context, info) => {
            return context.trace(
                "blockchain-resolve_workchain_blocks",
                async traceSpan => {
                    const repaired_args = {
                        master_seq_no_range: args.master_seq_no,
                        ...args,
                    }
                    return await resolve_blockchain_blocks(
                        repaired_args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
        workchain_transactions: async (_parent, args, context, info) => {
            return context.trace(
                "blockchain-workchain_transactions",
                async traceSpan => {
                    const repaired_args = {
                        master_seq_no_range: args.master_seq_no,
                        ...args,
                    }
                    return await resolve_blockchain_transactions(
                        repaired_args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
        account_transactions: async (_parent, args, context, info) => {
            return context.trace(
                "blockchain-account_transactions",
                async traceSpan => {
                    const repaired_args = {
                        master_seq_no_range: args.master_seq_no,
                        ...args,
                    }
                    return await resolve_account_transactions(
                        args.account_address,
                        repaired_args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
        blocks: async (_parent, args, context, info) => {
            return context.trace(
                "blockchain-resolve_workchain_blocks",
                async traceSpan => {
                    return await resolve_blockchain_blocks(
                        args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
        transactions: async (_parent, args, context, info) => {
            return context.trace(
                "blockchain-workchain_transactions",
                async traceSpan => {
                    return await resolve_blockchain_transactions(
                        args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
    },
    BlockchainAccountQuery: {
        info: async (parent, _args, context, info) => {
            return context.trace("blockchain-account-info", async traceSpan => {
                return resolve_account(parent.address, context, info, traceSpan)
            })
        },
        transactions: async (parent, args, context, info) => {
            return context.trace(
                "blockchain-account-transactions",
                async traceSpan => {
                    return await resolve_account_transactions(
                        parent.address,
                        args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
        messages: async (parent, args, context, info) => {
            return context.trace(
                "blockchain-account-messages",
                async traceSpan => {
                    return await resolve_account_messages(
                        parent,
                        args,
                        context,
                        info,
                        traceSpan,
                    )
                },
            )
        },
    },
    Node: {
        __resolveType: parent => {
            // it could fail if parent is a value from db instead of a value with resolved fields
            // need to test
            switch (parent.id.split("/")[0]) {
                case "account":
                    return "BlockchainAccount"
                case "block":
                    return "BlockchainBlock"
                case "message":
                    return "BlockchainMessage"
                case "transaction":
                    return "BlockchainTransaction"
                default:
                    return null
            }
        },
    },
}
