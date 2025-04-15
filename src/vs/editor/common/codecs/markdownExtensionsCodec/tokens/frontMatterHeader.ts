/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from '../../../core/range.js';
import { TokenStream } from './tokensStream.js';
import { BaseToken, Text } from '../../baseToken.js';
import { assert } from '../../../../../base/common/assert.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownExtensionsToken } from './markdownExtensionsToken.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { FrontMatterMarker, TMarkerToken } from './frontMatterMarker.js';
import { FrontMatterArray } from '../../frontMatterCodec/tokens/frontMatterArray.js';
import { FrontMatterString } from '../../frontMatterCodec/tokens/frontMatterString.js';
import { FrontMatterDecoder, TFrontMatterToken } from '../../frontMatterCodec/frontMatterDecoder.js';
import { FrontMatterToken, FrontMatterValueToken } from '../../frontMatterCodec/tokens/frontMatterToken.js';
import { FrontMatterRecord, FrontMatterRecordName } from '../../frontMatterCodec/tokens/frontMatterRecord.js';
import { SimpleToken } from '../../simpleCodec/tokens/simpleToken.js';

/**
 * Token that represents a `Front Matter` header in a text.
 */
export class FrontMatterHeader extends MarkdownExtensionsToken {
	constructor(
		range: Range,
		public readonly startMarker: FrontMatterMarker,
		public readonly content: Text,
		public readonly endMarker: FrontMatterMarker,
	) {
		super(range);
	}

	/**
	 * Return complete text representation of the token.
	 */
	public get text(): string {
		const text: string[] = [
			this.startMarker.text,
			this.content.text,
			this.endMarker.text,
		];

		return text.join('');
	}

	/**
	 * Range of the content of the Front Matter header.
	 */
	public get contentRange(): Range {
		return this.content.range;
	}

	/**
	 * Content token of the Front Matter header.
	 */
	public get contentToken(): Text {
		return this.content;
	}

	/**
	 * Check if this token is equal to another one.
	 */
	public override equals<T extends BaseToken>(other: T): boolean {
		if (!super.sameRange(other.range)) {
			return false;
		}

		if (!(other instanceof FrontMatterHeader)) {
			return false;
		}

		if (this.text.length !== other.text.length) {
			return false;
		}

		return (this.text === other.text);
	}

	/**
	 * Create new instance of the token from the given tokens.
	 */
	public static fromTokens(
		startMarkerTokens: readonly TMarkerToken[],
		contentTokens: readonly TSimpleDecoderToken[],
		endMarkerTokens: readonly TMarkerToken[],
	): FrontMatterHeader {
		const range = BaseToken.fullRange(
			[...startMarkerTokens, ...endMarkerTokens],
		);

		return new FrontMatterHeader(
			range,
			FrontMatterMarker.fromTokens(startMarkerTokens),
			Text.fromTokens(contentTokens),
			FrontMatterMarker.fromTokens(endMarkerTokens),
		);
	}

	/**
	 * Returns a string representation of the token.
	 */
	public override toString(): string {
		return `frontmatter("${this.shortText()}")${this.range}`;
	}
}

/**
 * TODO: @legomushroom
 */
const TOOLS_NAME = 'tools';

/**
 * TODO: @legomushroom
 */
export abstract class PromptMetadataDiagnostic {
	constructor(
		public readonly range: Range,
		public readonly message: string,
	) { }
}

/**
 * TODO: @legomushroom
 */
export class PromptMetadataWarning extends PromptMetadataDiagnostic { }

/**
 * TODO: @legomushroom
 */
export class PromptMetadataError extends PromptMetadataDiagnostic { }

/**
 * TODO: @legomushroom
 */
abstract class PromptMetadata extends FrontMatterToken {
	abstract readonly diagnostics: readonly PromptMetadataDiagnostic[];
}

/**
 * TODO: @legomushroom
 */
class PromptTools extends PromptMetadata {
	/**
	 * TODO: @legomushroom
	 */
	private readonly issues: PromptMetadataDiagnostic[];

	/**
	 * TODO: @legomushroom
	 */
	public get diagnostics(): readonly PromptMetadataDiagnostic[] {
		return this.issues;
	}

	/**
	 * TODO: @legomushroom
	 */
	private validToolNames: Set<string>;

	/**
	 * TODO: @legomushroom
	 */
	public get toolNames(): readonly string[] {
		return [...this.validToolNames.values()];
	}

	constructor(
		private readonly name: FrontMatterRecordName,
		private readonly value: FrontMatterValueToken,
	) {
		// sanity check on the name of the tools record
		assert(
			name.text === TOOLS_NAME,
			`Record name must be '${TOOLS_NAME}', got '${name.text}'.`,
		);

		super(
			BaseToken.fullRange([
				name,
				value,
			]),
		);

		this.issues = [];
		this.validToolNames = new Set<string>();
		this.collectDiagnostics();
	}

	/**
	 * TODO: @legomushroom
	 */
	public get valid(): boolean {
		for (const diagnostic of this.diagnostics) {
			if (diagnostic instanceof PromptMetadataError) {
				return false;
			}
		}

		return true;
	}

	/**
	 * TODO: @legomushroom
	 */
	// TODO: @legomushroom - add diagnostics for duplicate records
	private collectDiagnostics(): void {
		// validate that the record value is an array
		if ((this.value instanceof FrontMatterArray) === false) {
			this.issues.push(
				new PromptMetadataError(
					this.value.range,
					`The '${TOOLS_NAME}' record must have an array value, got '${this.value.text}'.`, // TODO: @legomushroom - localize the message
				),
			);

			return;
		}

		const arrayValue: FrontMatterArray = this.value;

		// validate that all tool names are strings
		for (const item of arrayValue.items) {
			if ((item instanceof FrontMatterString) === false) {
				this.issues.push(
					new PromptMetadataError(
						item.range,
						`Expected a tool name (string), got ${item.valueTypeName}.`, // TODO: @legomushroom - localize the message
					),
				);

				continue;
			}

			const cleanToolName = item.cleanText.trim();

			if (cleanToolName.length === 0) {
				this.issues.push(
					new PromptMetadataWarning(
						item.range,
						'Tool name cannot be empty.', // TODO: @legomushroom - localize the message
					),
				);

				continue;
			}

			if (this.validToolNames.has(cleanToolName)) {
				this.issues.push(
					new PromptMetadataWarning(
						item.range,
						`Duplicate tool name '${cleanToolName}'.`, // TODO: @legomushroom - localize the message
					),
				);

				continue;
			}

			// TODO: @legomushroom - validate that tool names are known
			this.validToolNames.add(cleanToolName);
		}

	}

	public override get text(): string {
		return BaseToken.render([
			this.name,
			this.value,
		]);
	}

	public override toString(): string {
		return `prompt-tools(${this.shortText()})${this.range}`;
	}
}

/**
 * TODO: @legomushroom
 */
export type TDiagnostic = PromptMetadataWarning | PromptMetadataError;

/**
 * TODO: @legomushroom
 */
type TMetadataRecord = PromptTools;

/**
 * TODO: @legomushroom
 */
export class PromptHeader extends Disposable {
	/**
	 * TODO: @legomushroom
	 */
	private readonly stream: FrontMatterDecoder;

	/**
	 * TODO: @legomushroom
	 */
	private readonly metadata: TMetadataRecord[];

	/**
	 * TODO: @legomushroom
	 */
	private readonly issues: TDiagnostic[];

	/**
	 * TODO: @legomushroom
	 */
	private readonly existentRecordNames: Set<string>;

	/**
	 * TODO: @legomushroom
	 */
	public get diagnostics(): readonly TDiagnostic[] {
		const result = [];

		for (const metadata of this.metadata) {
			result.push(...metadata.diagnostics);
		}

		result.push(...this.issues);

		return result;
	}

	constructor(
		public readonly contentsToken: Text,
	) {
		super();

		this.stream = this._register(
			new FrontMatterDecoder(
				new TokenStream(contentsToken.tokens),
			),
		);

		this.issues = [];
		this.metadata = [];
		this.existentRecordNames = new Set<string>();

		this.stream.onData(this.onData.bind(this));
		this.stream.onError(this.onError.bind(this));
	}

	/**
	 * TODO: @legomushroom
	 */
	private onData(token: TFrontMatterToken): void {
		if ((token instanceof FrontMatterRecord) === false) {
			if (token instanceof SimpleToken) {
				return;
			}

			this.issues.push(
				new PromptMetadataError(
					token.range,
					// TODO: @legomushroom - improve `token` toString() logic
					`Unexpected token '${token.text}'.`, // TODO: @legomushroom - localize the message
				),
			);

			return;
		}

		const recordName = token.nameToken.text;

		if (this.existentRecordNames.has(recordName)) {
			this.issues.push(
				new PromptMetadataWarning(
					token.range,
					`Duplicate metadata record '${recordName}' will be ignored.`, // TODO: @legomushroom - localize the message
				),
			);

			return;
		}

		if (recordName === TOOLS_NAME) {
			this.existentRecordNames.add(recordName);

			this.metadata.push(
				new PromptTools(
					token.nameToken,
					token.valueToken,
				),
			);

			return;
		}

		this.issues.push(
			new PromptMetadataWarning(
				token.range,
				`Unknown metadata record '${recordName}' will be ignored.`, // TODO: @legomushroom - localize the message
			),
		);
	}

	/**
	 * TODO: @legomushroom
	 */
	private onError(error: Error): void {
		// TODO: @legomushroom - add errors to diagnostics
		console.log(error);
	}

	/**
	 * TODO: @legomushroom
	 */
	public get settled(): Promise<void> {
		return this.stream.settled;
	}

	/**
	 * TODO: @legomushroom
	 */
	public start(): this {
		this.stream.start();

		return this;
	}
}
