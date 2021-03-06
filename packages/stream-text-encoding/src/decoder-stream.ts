/**
 * streams-text-encoding/decoder-stream - transform stream wrapping TextDecoder
 * Part of Stardazed
 * (c) 2018 by Arthur Langereis - @zenmumbler
 * https://github.com/stardazed/sd-streams
 */

const decDecoder = Symbol("decDecoder");
const decTransform = Symbol("decTransform");

export interface TextDecoderCommon {
	readonly encoding: string;
	readonly fatal: boolean;
	readonly ignoreBOM: boolean;
}

class TextDecodeTransformer implements Transformer {
	private decoder_: TextDecoder;

	constructor(decoder: TextDecoder) {
		this.decoder_ = decoder;
	}

	transform(chunk: unknown, controller: TransformStreamDefaultController) {
		if (! (chunk instanceof ArrayBuffer || ArrayBuffer.isView(chunk))) {
			throw new TypeError("Input data must be a BufferSource");
		}
		const text = this.decoder_.decode(chunk, { stream: true });
		if (text.length !== 0) {
			controller.enqueue(text);
		}
	}

	flush(controller: TransformStreamDefaultController) {
		const text = this.decoder_.decode();
		if (text.length !== 0) {
			controller.enqueue(text);
		}
	}
}

export class TextDecoderStream implements GenericTransformStream, TextDecoderCommon {
	private [decDecoder]: TextDecoder;
	private [decTransform]: TransformStream;

	constructor(label?: string, options?: TextDecoderOptions) {
		this[decDecoder] = new TextDecoder(label, options);
		this[decTransform] = new TransformStream(new TextDecodeTransformer(this[decDecoder]));
	}

	get encoding() {
		return this[decDecoder].encoding;
	}

	get fatal() {
		return this[decDecoder].fatal;
	}

	get ignoreBOM() {
		return this[decDecoder].ignoreBOM;
	}

	get readable() {
		return this[decTransform].readable;
	}

	get writable() {
		return this[decTransform].writable;
	}
}
