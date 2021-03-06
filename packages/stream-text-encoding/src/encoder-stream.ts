/**
 * streams-text-encoding/encoder-stream - transform stream wrapping TextEncoder
 * Part of Stardazed
 * (c) 2018 by Arthur Langereis - @zenmumbler
 * https://github.com/stardazed/sd-streams
 */

const encEncoder = Symbol("encEncoder");
const encTransform = Symbol("encTransform");

export interface TextEncoderCommon {
	readonly encoding: string;
}

class TextEncodeTransformer implements Transformer {
	private encoder_: TextEncoder;
	private partial_: string | undefined;

	constructor(encoder: TextEncoder) {
		this.encoder_ = encoder;
		this.partial_ = undefined;
	}

	transform(chunk: unknown, controller: TransformStreamDefaultController) {
		let stringChunk = String(chunk);
		if (this.partial_ !== undefined) {
			stringChunk = this.partial_ + stringChunk;
			this.partial_ = undefined;
		}
		
		const lastCharIndex = stringChunk.length - 1;
		const lastCodeUnit = stringChunk.charCodeAt(lastCharIndex);
		if (lastCodeUnit >= 0xD800 && lastCodeUnit < 0xDC00) {
			this.partial_ = String.fromCharCode(lastCodeUnit);
			stringChunk = stringChunk.substring(0, lastCharIndex);
		}

		const bytes = this.encoder_.encode(stringChunk);
		if (bytes.length !== 0) {
			controller.enqueue(bytes);
		}
	}

	flush(controller: TransformStreamDefaultController) {
		if (this.partial_) {
			controller.enqueue(this.encoder_.encode(this.partial_));
			this.partial_ = undefined;
		}
	}
}

export class TextEncoderStream implements GenericTransformStream, TextEncoderCommon {
	private [encEncoder]: TextEncoder;
	private [encTransform]: TransformStream;

	constructor() {
		this[encEncoder] = new TextEncoder();
		this[encTransform] = new TransformStream(new TextEncodeTransformer(this[encEncoder]));
	}

	get encoding() {
		return this[encEncoder].encoding;
	}

	get readable() {
		return this[encTransform].readable;
	}

	get writable() {
		return this[encTransform].writable;
	}
}
