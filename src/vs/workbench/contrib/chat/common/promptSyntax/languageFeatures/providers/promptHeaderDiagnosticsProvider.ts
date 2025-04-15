/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPromptsService } from '../../service/types.js';
import { ProviderInstanceBase } from './providerInstanceBase.js';
import { assertNever } from '../../../../../../../base/common/assert.js';
import { ITextModel } from '../../../../../../../editor/common/model.js';
import { ProviderInstanceManagerBase } from './providerInstanceManagerBase.js';
import { IMarkerData, IMarkerService, MarkerSeverity } from '../../../../../../../platform/markers/common/markers.js';
import { PromptMetadataError, PromptMetadataWarning, TDiagnostic } from '../../../../../../../editor/common/codecs/markdownExtensionsCodec/tokens/frontMatterHeader.js';

/**
 * Unique ID of the markers provider class.
 */
const MARKERS_OWNER_ID = 'prompts-header-diagnostics-provider';

// TODO: @legomushroom
class PromptHeaderDiagnosticsProvider extends ProviderInstanceBase {
	constructor(
		model: ITextModel,
		@IPromptsService promptsService: IPromptsService,
		@IMarkerService private readonly markerService: IMarkerService,
	) {
		super(model, promptsService);
	}

	/**
	 * Update diagnostic markers for the current editor.
	 */
	// TODO: @legomushroom - add the TS method debounce decorator
	protected override async onPromptParserUpdate(): Promise<this> {
		// ensure that parsing process is settled
		await this.parser.allSettled();

		// clean up all previously added markers
		this.markerService.remove(MARKERS_OWNER_ID, [this.model.uri]);

		const { header } = this.parser;

		if (header === undefined) {
			return this;
		}

		const markers: IMarkerData[] = [];
		for (const link of header.diagnostics) {
			markers.push(toMarker(link));
		}

		this.markerService.changeOne(
			MARKERS_OWNER_ID,
			this.model.uri,
			markers,
		);

		return this;
	}

	/**
	 * Returns a string representation of this object.
	 */
	public override toString() {
		return `prompt-link-diagnostics:${this.model.uri.path}`;
	}
}

/**
 * TODO: @legomushroom
 */
const toMarker = (
	diagnostic: TDiagnostic,
): IMarkerData => {
	if (diagnostic instanceof PromptMetadataWarning) {
		return {
			message: diagnostic.message,
			severity: MarkerSeverity.Warning,
			...diagnostic.range,
		};
	}

	if (diagnostic instanceof PromptMetadataError) {
		return {
			message: diagnostic.message,
			severity: MarkerSeverity.Error,
			...diagnostic.range,
		};
	}


	assertNever(
		diagnostic,
		`Unknown prompt metadata diagnostic type '${diagnostic}'.`,
	);
};

/**
 * The class that manages creation and disposal of {@link PromptHeaderDiagnosticsProvider}
 * classes for each specific editor text model.
 */
export class PromptHeaderDiagnosticsInstanceManager extends ProviderInstanceManagerBase<PromptHeaderDiagnosticsProvider> {
	protected override get InstanceClass() {
		return PromptHeaderDiagnosticsProvider;
	}
}
