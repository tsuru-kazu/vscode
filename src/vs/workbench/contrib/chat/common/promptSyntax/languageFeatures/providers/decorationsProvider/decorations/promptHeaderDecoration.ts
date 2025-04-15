/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TAddAccessor, TDecorationStyles, DecorationBase } from './utils/index.js';
import { Text } from '../../../../../../../../../editor/common/codecs/baseToken.js';
import { PromptHeader } from '../../../../../../../../../editor/common/codecs/markdownExtensionsCodec/tokens/frontMatterHeader.js';

/**
 * Decoration CSS class names.
 */
export enum CssClassNames {
	main = '.prompt-header-decoration',
	inline = '.prompt-header-decoration-inline',
}
/**
 * CSS styles for the decoration.
 */
export const CSS_STYLES = {
	[CssClassNames.main]: [
		'border: 2px solid red;',
	],
	[CssClassNames.inline]: [
		'color: red;',
	],
};

/**
 * Editor decoration for the Front Matter header token inside a prompt.
 */
// TODO: @legomushroom - remove
export class PromptHeaderDecoration extends DecorationBase<Text, CssClassNames> {
	constructor(
		accessor: TAddAccessor,
		header: PromptHeader,
	) {
		super(accessor, header.contentsToken);
	}

	protected override get className(): CssClassNames {
		return CssClassNames.main;
	}

	protected override get inlineClassName(): CssClassNames {
		return CssClassNames.inline;
	}

	protected override get description(): string {
		return 'Prompt metadata header decoration.';
	}

	public static get cssStyles(): TDecorationStyles {
		return CSS_STYLES;
	}
}
