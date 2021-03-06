/**
 * streams/writable-stream - WritableStream class implementation
 * Part of Stardazed
 * (c) 2018 by Arthur Langereis - @zenmumbler
 * https://github.com/stardazed/sd-streams
 */

import * as ws from "./writable-internals";
import * as shared from "./shared-internals";
import { WritableStreamDefaultController, setUpWritableStreamDefaultControllerFromUnderlyingSink } from "./writable-stream-default-controller";
import { WritableStreamDefaultWriter } from "./writable-stream-default-writer";

export class WritableStream {
	[shared.state_]: ws.WritableStreamState;
	[shared.storedError_]: any;
	[ws.backpressure_]: boolean;
	[ws.closeRequest_]: shared.ControlledPromise<void> | undefined;
	[ws.inFlightWriteRequest_]: shared.ControlledPromise<void> | undefined;
	[ws.inFlightCloseRequest_]: shared.ControlledPromise<void> | undefined;
	[ws.pendingAbortRequest_]: ws.AbortRequest | undefined;
	[ws.writableStreamController_]: ws.WritableStreamDefaultController | undefined;
	[ws.writer_]: ws.WritableStreamDefaultWriter | undefined;
	[ws.writeRequests_]: shared.ControlledPromise<any>[];

	constructor(sink: ws.WritableStreamSink = {}, strategy: shared.StreamStrategy = {}) {
		ws.initializeWritableStream(this);
		const sizeFunc = strategy.size;
		const stratHWM = strategy.highWaterMark;
		if (sink.type !== undefined) {
			throw new RangeError("The type of an underlying sink must be undefined");
		}

		const sizeAlgorithm = shared.makeSizeAlgorithmFromSizeFunction(sizeFunc);
		const highWaterMark = shared.validateAndNormalizeHighWaterMark(stratHWM === undefined ? 1 : stratHWM);

		setUpWritableStreamDefaultControllerFromUnderlyingSink(this, sink, highWaterMark, sizeAlgorithm);
	}

	get locked(): boolean {
		if (! ws.isWritableStream(this)) {
			throw new TypeError();
		}
		return ws.isWritableStreamLocked(this);
	}

	abort(reason?: any): Promise<void> {
		if (! ws.isWritableStream(this)) {
			return Promise.reject(new TypeError());
		}
		if (ws.isWritableStreamLocked(this)) {
			return Promise.reject(new TypeError("Cannot abort a locked stream"));
		}
		return ws.writableStreamAbort(this, reason);
	}

	getWriter(): ws.WritableStreamWriter {
		if (! ws.isWritableStream(this)) {
			throw new TypeError();
		}
		return new WritableStreamDefaultWriter(this);
	}
}

export function createWritableStream(startAlgorithm: ws.StartAlgorithm, writeAlgorithm: ws.WriteAlgorithm, closeAlgorithm: ws.CloseAlgorithm, abortAlgorithm: ws.AbortAlgorithm, highWaterMark?: number, sizeAlgorithm?: shared.SizeAlgorithm) {
	if (highWaterMark === undefined) {
		highWaterMark = 1;
	}
	if (sizeAlgorithm === undefined) {
		sizeAlgorithm = () => 1;
	}
	// Assert: ! IsNonNegativeNumber(highWaterMark) is true.

	const stream = Object.create(WritableStream.prototype) as WritableStream;
	ws.initializeWritableStream(stream);
	const controller = Object.create(WritableStreamDefaultController.prototype) as WritableStreamDefaultController;
	ws.setUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
	return stream;
}
