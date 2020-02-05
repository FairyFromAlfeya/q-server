// @flow

import type { QConfig } from "./config";
import { tracer as noopTracer } from "opentracing/lib/noop";
import { Tracer, Tags, FORMAT_TEXT_MAP, FORMAT_BINARY, Span, SpanContext } from "opentracing";

import { initTracerFromEnv as initJaegerTracer } from 'jaeger-client';

export class QTracer {
    static create(config: QConfig): Tracer {
        const endpoint = config.jaeger.endpoint;
        if (!endpoint) {
            return noopTracer;
        }
        return initJaegerTracer({
            serviceName: 'Q Server',
            sampler: {
                type: 'const',
                param: 1,
            },
            reporter: {
                collectorEndpoint: endpoint,
                logSpans: true,
            }
        }, {
            logger: {
                info(msg) {
                    console.log('INFO ', msg);
                },
                error(msg) {
                    console.log('ERROR', msg);
                },
            },
        });
    }

    static extractParentSpan(tracer: Tracer, req: any): any {
        let ctx_src, ctx_frm;
        if (req.headers) {
            ctx_src = req.headers;
            ctx_frm = FORMAT_TEXT_MAP;
        } else {
            ctx_src = req.context;
            ctx_frm = FORMAT_BINARY;
        }
        return tracer.extract(ctx_frm, ctx_src);
    }

    static getParentSpan(tracer: Tracer, context: any): (SpanContext | typeof undefined) {
        return context.tracerParentSpan;
    }

    static async trace<T>(
        tracer: Tracer,
        name: string,
        f: (span: Span) => Promise<T>,
        parentSpan?: (Span | SpanContext)
    ): Promise<T> {
        const span = tracer.startSpan(name, { childOf: parentSpan });
        try {
            span.setTag(Tags.SPAN_KIND, 'server');
            const result = await f(span);
            if (result !== undefined) {
                span.setTag('result', result);
            }
            span.finish();
            return result;
        } catch (error) {
            span.logEvent('failed', error);
            span.finish();
            throw error;
        }
    }
}
