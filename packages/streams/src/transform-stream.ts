/**
 * streams/transform-stream - TransformStream class implementation
 * Part of Stardazed
 * (c) 2018 by Arthur Langereis - @zenmumbler
 * https://github.com/stardazed/sd-streams
 */

import * as rs from "./readable-internals";
import * as ws from "./writable-internals";
import * as ts from "./transform-internals";
import * as shared from "./shared-internals";
import { TransformStreamDefaultController } from "./transform-stream-default-controller";

export class TransformStream {
	[ts.backpressure_]: boolean | undefined; // Whether there was backpressure on [[readable]] the last time it was observed
	[ts.backpressureChangePromise_]: shared.ControlledPromise<void>; // A promise which is fulfilled and replaced every time the value of[[backpressure]] changes
	[ts.readable_]: rs.ReadableStream; // The ReadableStream instance controlled by this object
	[ts.transformStreamController_]: TransformStreamDefaultController; // A TransformStreamDefaultController created with the ability to control[[readable]] and[[writable]]; also used for the IsTransformStream brand check
	[ts.writable_]: ws.WritableStream; // The WritableStream instance controlled by this object

	constructor(transformer: ts.Transformer = {}, writableStrategy: shared.StreamStrategy = {}, readableStrategy: shared.StreamStrategy = {}) {
		const writableSizeFunction = writableStrategy.size;
		const writableHighWaterMark = writableStrategy.highWaterMark;
		const readableSizeFunction = readableStrategy.size;
		const readableHighWaterMark = readableStrategy.highWaterMark;

		const writableType = transformer.writableType;
		if (writableType !== undefined) {
			throw new RangeError("The transformer's `writableType` field must be undefined");
		}
		const writableSizeAlgorithm = shared.makeSizeAlgorithmFromSizeFunction(writableSizeFunction);
		const writableHWM = shared.validateAndNormalizeHighWaterMark(writableHighWaterMark === undefined ? 1 : writableHighWaterMark);

		const readableType = transformer.readableType;
		if (readableType !== undefined) {
			throw new RangeError("The transformer's `readableType` field must be undefined");
		}
		const readableSizeAlgorithm = shared.makeSizeAlgorithmFromSizeFunction(readableSizeFunction);
		const readableHWM = shared.validateAndNormalizeHighWaterMark(readableHighWaterMark === undefined ? 0 : readableHighWaterMark);

		const startPromise = shared.createControlledPromise<void>();
		ts.initializeTransformStream(this, startPromise.promise, writableHWM, writableSizeAlgorithm, readableHWM, readableSizeAlgorithm);
		setUpTransformStreamDefaultControllerFromTransformer(this, transformer);

		const startResult = shared.invokeOrNoop(transformer, "start", [this[ts.transformStreamController_]]);
		startPromise.resolve(startResult);
	}

	get readable(): rs.ReadableStream {
		if (! ts.isTransformStream(this)) {
			throw new TypeError();
		}
		return this[ts.readable_];
	}

	get writable(): ws.WritableStream {
		if (!ts.isTransformStream(this)) {
			throw new TypeError();
		}
		return this[ts.writable_];
	}
}

function setUpTransformStreamDefaultControllerFromTransformer(stream: TransformStream, transformer: ts.Transformer) {
	const controller = Object.create(TransformStreamDefaultController.prototype) as TransformStreamDefaultController;
	let transformAlgorithm: ts.TransformAlgorithm;

	const transformMethod = transformer.transform;
	if (transformMethod !== undefined) {
		if (typeof transformMethod !== "function") {
			throw new TypeError("`transform` field of the transformer must be a function");
		}
		transformAlgorithm = (chunk: any) => shared.promiseCall(transformMethod, transformer, [chunk, controller]);
	}
	else {
		// use identity transform
		transformAlgorithm = function(chunk: any) {
			try {
				ts.transformStreamDefaultControllerEnqueue(controller, chunk);
			}
			catch (error) {
				return Promise.reject(error);
			}
			return Promise.resolve(undefined);
		};
	}
	const flushAlgorithm = shared.createAlgorithmFromUnderlyingMethod(transformer, "flush", [controller]);
	ts.setUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
}
