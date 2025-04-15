/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseToken } from '../../baseToken.js';
import { assert, assertNever } from '../../../../../base/common/assert.js';
import { ObservableDisposable } from '../../../../../base/common/observableDisposable.js';
import { newWriteableStream, WriteableStream, ReadableStream } from '../../../../../base/common/stream.js';

/**
 * TODO: @legomushroom
 */
// TODO: @legomushroom - move somewhere else
export class TokenStream<T extends BaseToken> extends ObservableDisposable implements ReadableStream<T> {
	private readonly _stream: WriteableStream<T>;

	/**
	 * TODO: @legomushroom
	 */
	private index: number;

	constructor(
		private readonly tokens: readonly T[],
	) {
		super();

		this._stream = newWriteableStream<T>(null);
		this.index = 0;

		this.startSendingTokens();
	}

	/**
	 * TODO: @legomushroom
	 */
	private interval: NodeJS.Timeout | undefined;

	/**
	 * TODO: @legomushroom
	 */
	private startSendingTokens(): void {
		assert(
			this.interval === undefined,
			'Tokens are already being sent.',
		);

		assert(
			this.index === 0,
			'Tokens are already being sent.',
		);

		if (this.tokens.length === 0) {
			this._stream.end();
			return;
		}

		this.interval = setInterval(() => {
			if (this.index >= this.tokens.length) {
				clearInterval(this.interval);
				delete this.interval;

				this._stream.end();

				return;
			}

			this.sendSomeTokens();
		}, 1);

		this._register({
			dispose: () => {
				clearInterval(this.interval);
				delete this.interval;
			}
		});
	}

	/**
	 * TODO: @legomushroom
	 */
	private sendSomeTokens(): void {
		const tokensLeft = this.tokens.length - this.index;
		if (tokensLeft <= 0) {
			return;
		}

		// send up to 10 tokens at a time
		let tokensToSend = Math.min(tokensLeft, 10);
		while (tokensToSend > 0) {
			assert(
				this.index < this.tokens.length,
				`Token index '${this.index}' is out of bounds.`,
			);

			this._stream.write(this.tokens[this.index]);
			this.index++;
			tokensToSend--;
		}
	}

	public pause(): void {
		return this._stream.pause();
	}

	public resume(): void {
		return this._stream.resume();
	}

	public destroy(): void {
		this._stream.destroy();
		this.dispose();
	}

	public removeListener(event: string, callback: Function): void {
		return this._stream.removeListener(event, callback);
	}

	public on(event: 'data', callback: (data: T) => void): void;
	public on(event: 'error', callback: (err: Error) => void): void;
	public on(event: 'end', callback: () => void): void;
	public on(event: 'data' | 'error' | 'end', callback: (arg?: any) => void): void {
		if (event === 'data') {
			return this._stream.on(event, callback);
		}

		if (event === 'error') {
			return this._stream.on(event, callback);
		}

		if (event === 'end') {
			return this._stream.on(event, callback);
		}

		assertNever(
			event,
			`Unexpected event name '${event}'.`,
		);
	}
}
