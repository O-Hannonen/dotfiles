"use strict";
// Copyright 2022 Google LLC
Object.defineProperty(exports, "__esModule", { value: true });
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//     https://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
const assert = require("assert");
const path = require("path");
const util_1 = require("util");
const os_1 = require("os");
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require("vscode");
const decorate_1 = require("../../decorate");
const messageParser_1 = require("../../messageParser");
const diagnose_1 = require("../../diagnose");
const annotationNames = new Map([
    [decorate_1.placeholderDecoration, '[decoration]placeholder'],
    [decorate_1.selectDecoration, '[decoration]select'],
    [decorate_1.pluralDecoration, '[decoration]plural'],
]);
suite('Extension Test Suite', async () => {
    test("Decorate golden file.", async () => {
        const contentWithAnnotations = await buildContentWithAnnotations('testarb.arb');
        if (process.env.UPDATE_GOLDENS) {
            console.warn('Updating golden test.');
            // Run ```
            // UPDATE_GOLDENS=1 npm test
            // ``` to regenerate the golden test
            await regenerateGolden(contentWithAnnotations, 'testarb.annotated');
        }
        else {
            const goldenEditor = await getEditor('testarb.annotated');
            assert.equal(contentWithAnnotations, goldenEditor.document.getText());
        }
    });
    test("A rough parser test, as the real test will be done by the golden.", async () => {
        const document = `{
			"@@locale": "en",
			"appName": "Demo app",
			"pageLog{inUsername": "Your username",
			"@pageLoginUsername": {},
			"pageLoginPassword": "Your password",
			"@pageLoginPassword": {},
			"pageHomeTitle": "Welcome {firstName} to {test}!",
			"@pageHomeTitle": {
				"description": "Welcome message on the Home screen",
				"placeholders": {
					"firstName": {}
				}
			},
			"pageHomeInboxCount": "{count, plural, zero{I have {vehicle;;Type, select, sedn{Sedan} cabrolet{Solid roof cabriolet} tuck{16 wheel truck} oter{Other}} no new messages} one{You have 1 new message} other{You have {count} new messages}}",
			"@pageHomeInboxCount": {
				"description": "New messages count on the Home screen",
				"placeholders": {
					"count": {},
					"vehicleType": {}
				}
			},
			"commonVehicleType": "{vehicleType, select, sedan{Sedan} cabriolet{Solid roof cabriolet} truck{16 wheel truck} other{Other}}",
			"@commonVeshicleType": {
				"description": "Vehicle type",
				"placeholders": {
					"vehicleType": {}
				}
			}
		}`;
        const [messages, errors] = new messageParser_1.Parser().parse(document);
        assert.equal(errors.length, 0);
        assert.equal(messages.messageEntries.length, 6);
        assert.equal(messages.metadataEntries.length, 5);
    });
    test("Test quickfix for missing Metadata", async () => await testFixAgainstGolden('quickfix.arb', getFirstKey, 'quickfix.golden'));
    test("Test quickfix for placeholder without metadata with tabs", async () => await testFixAgainstGolden('quickfix2.arb', getPlaceholder, 'quickfix2.golden'));
    test("Test quickfix for placeholder without metadata with spaces", async () => await testFixAgainstGolden('quickfix2_spaces.arb', getPlaceholder, 'quickfix2_spaces.golden'));
});
const testFolderLocation = "/../../../src/test/";
function getFirstKey(messageList) {
    return messageList.messageEntries[0].key;
}
function getPlaceholder(messageList) {
    const message = messageList.messageEntries[0].message;
    const entry = message.getPlaceholders()[0];
    return entry;
}
async function testFixAgainstGolden(testFile, getItemFromParsed, goldenFile) {
    const editor = await getEditor(testFile);
    // Parse original
    const [messageList, _] = new messageParser_1.Parser().parse(editor.document.getText());
    // Apply fix for placeholder not defined in metadata
    const item = getItemFromParsed(messageList);
    const actions = await vscode.commands.executeCommand("vscode.executeCodeActionProvider", editor.document.uri, new vscode.Range(editor.document.positionAt(item.start + 1), editor.document.positionAt(item.end - 1)));
    await vscode.workspace.applyEdit(actions[0].edit);
    // Compare with golden
    if (process.env.UPDATE_GOLDENS) {
        console.warn('Updating golden test.');
        // Run ```
        // UPDATE_GOLDENS=1 npm test
        // ``` to regenerate the golden test
        await regenerateGolden(editor.document.getText(), goldenFile);
    }
    else {
        const goldenEditor = await getEditor(goldenFile);
        assert.equal(editor.document.getText(), goldenEditor.document.getText());
    }
}
async function regenerateGolden(newContent, goldenFilename) {
    const uri = vscode.Uri.file(path.join(__dirname, testFolderLocation, goldenFilename));
    await vscode.workspace.fs.writeFile(uri, new util_1.TextEncoder().encode(newContent));
}
async function buildContentWithAnnotations(filename) {
    const editor = await getEditor(filename);
    const [messageList, errors] = new messageParser_1.Parser().parse(editor.document.getText());
    const decorations = new decorate_1.Decorator().decorate(editor, messageList);
    const diagnostics = new diagnose_1.Diagnostics().diagnose(editor, messageList, errors);
    const content = editor.document.getText();
    const annotationsForLine = new Map();
    for (const entry of decorations.entries() ?? []) {
        const decorationType = entry[0];
        for (const range of entry[1]) {
            for (let lineNumber = range.start.line; lineNumber <= range.end.line; lineNumber++) {
                const line = editor.document.lineAt(lineNumber);
                const offsetInLine = range.start.character - line.range.start.character;
                const lengthInLine = (line.range.end.character - range.start.character) - (line.range.end.character - range.end.character);
                const annotation = ' '.repeat(offsetInLine) + '^'.repeat(lengthInLine) + annotationNames.get(decorationType);
                annotationsForLine.set(lineNumber, [...(annotationsForLine.get(lineNumber) ?? []), annotation]);
            }
        }
    }
    for (const diagnostic of diagnostics ?? []) {
        const range = diagnostic.range;
        for (let lineNumber = range.start.line; lineNumber <= range.end.line; lineNumber++) {
            const line = editor.document.lineAt(lineNumber);
            const offsetInLine = range.start.character - line.range.start.character;
            const lengthInLine = (line.range.end.character - range.start.character) - (line.range.end.character - range.end.character);
            const annotation = ' '.repeat(offsetInLine) + '^'.repeat(lengthInLine) + '[' + vscode.DiagnosticSeverity[diagnostic.severity] + ']:"' + diagnostic.message + '"';
            annotationsForLine.set(lineNumber, [...(annotationsForLine.get(lineNumber) ?? []), annotation]);
        }
    }
    const lines = content.split(os_1.EOL);
    const numLines = lines.length;
    for (let index = numLines; index > 0; index--) {
        if (annotationsForLine.has(index)) {
            lines.splice(index + 1, 0, ...annotationsForLine.get(index));
        }
    }
    const contentWithAnnotations = lines.join(os_1.EOL);
    return contentWithAnnotations;
}
async function getEditor(filename) {
    const testFilePath = path.join(__dirname, testFolderLocation, filename);
    const uri = vscode.Uri.file(testFilePath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    return editor;
}
//# sourceMappingURL=extension.test.js.map