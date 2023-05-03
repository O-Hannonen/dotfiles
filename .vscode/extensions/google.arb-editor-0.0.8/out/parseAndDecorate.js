// Copyright 2022 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//     https://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecoratorAndParser = exports.pluralDecoration = exports.selectDecoration = exports.placeholderDecoration = void 0;
const path = require("path");
const jsonc_parser_1 = require("jsonc-parser");
const vscode = require("vscode");
const XRegExp = require("xregexp");
exports.placeholderDecoration = vscode.window.createTextEditorDecorationType({
    light: {
        color: '#ff6f00'
    },
    dark: {
        color: '#fff9c4'
    }
});
exports.selectDecoration = vscode.window.createTextEditorDecorationType({
    light: {
        color: '#6a1b9a'
    },
    dark: {
        color: '#ce93d8'
    }
});
exports.pluralDecoration = vscode.window.createTextEditorDecorationType({
    light: {
        color: '#0277bd'
    },
    dark: {
        color: '#b3e5fc'
    }
});
const selectRegex = /^([^\{\}]+\s*,\s*(?:select|gender)\s*,\s*(?:[^\{\}]*\{.*\})*)$/;
const pluralRegex = /^[^\{\}]+\s*,\s*plural\s*,\s*(?:offset:\d+)?\s*(?:[^\{\} ]*?\s*\{.*\})$/;
const placeholderNameRegex = /^[a-zA-Z][a-zA-Z_$0-9]*$/; //Must be able to translate to a (non-private) Dart variable
const keyNameRegex = /^[a-zA-Z][a-zA-Z_0-9]*$/; //Must be able to translate to a (non-private) Dart method
class Literal {
    constructor(value, start, end) {
        this.value = value;
        this.start = start;
        this.end = end;
        this.toString = () => {
            return `Literal(${this.value},${this.start},${this.end})`;
        };
    }
}
class DecoratorAndParser {
    constructor(context) {
        this.diagnostics = vscode.languages.createDiagnosticCollection("arb");
        context?.subscriptions.push(this.diagnostics);
    }
    parseAndDecorate(editor) {
        // Prefill decorations map to avoid having old decoration hanging around
        let decorationsMap = new Map([
            [exports.placeholderDecoration, []],
            [exports.selectDecoration, []],
            [exports.pluralDecoration, []],
        ]);
        let diagnosticsList = [];
        // Map of arguments for each message key
        let placeHoldersForKey = new Map();
        // Only trigger on arb files
        if (!editor || !path.basename(editor.document.fileName).endsWith('.arb')) {
            return null;
        }
        let nestingLevel = 0;
        let placeholderLevel;
        let metadataLevel;
        let messageKey;
        let definedPlaceholders = [];
        (0, jsonc_parser_1.visit)(editor.document.getText(), {
            onLiteralValue: (value, offset) => {
                if (nestingLevel === 1) {
                    try {
                        decorateMessage(value, offset, decorationsMap, editor, true);
                    }
                    catch (error) {
                        if (String(error).startsWith('Error: Unbalanced ')) { //Very hacky, but better than not checking at all... The error has no special type, unfortunately.
                            showErrorAt(offset + 1, offset + value.length + 1, 'Unbalanced curly bracket found. Try escaping the bracket using a single quote \' .', vscode.DiagnosticSeverity.Error);
                        }
                        else {
                            throw error;
                        }
                    }
                }
            },
            onObjectBegin: (offset, length, startLine, startCharacter, pathSupplier) => {
                nestingLevel++;
            },
            onObjectProperty: (property, offset, length, startLine, startCharacter, pathSupplier) => {
                if (placeholderLevel === nestingLevel - 1) {
                    if (!placeHoldersForKey.get(messageKey).some((literal, index, array) => literal.value === property)) {
                        showErrorAt(offset + 1, offset + property.length + 1, `Placeholder "${property}" is being declared, but not used in message.`, vscode.DiagnosticSeverity.Warning);
                    }
                    definedPlaceholders.push(property);
                    decorateAt(offset + 1, offset + property.length + 1, exports.placeholderDecoration);
                }
                if (nestingLevel === 1) {
                    const isMetadata = property.startsWith('@');
                    const propertyOffsetEnd = offset + property.length + 1;
                    const propertyOffsetStart = offset + 1;
                    if (isMetadata) {
                        const isGlobalMetadata = property.startsWith('@@');
                        const messageKeyExists = placeHoldersForKey.has(property.substring(1));
                        if (!isGlobalMetadata && !messageKeyExists) {
                            showErrorAt(propertyOffsetStart, propertyOffsetEnd, `Metadata for an undefined key. Add a message key with the name "${property.substring(1)}".`, vscode.DiagnosticSeverity.Error);
                        }
                        metadataLevel = nestingLevel;
                    }
                    else {
                        if (keyNameRegex.exec(property) !== null) {
                            messageKey = property;
                            placeHoldersForKey.set(messageKey, []);
                        }
                        else {
                            showErrorAt(propertyOffsetStart, propertyOffsetEnd, `Key "${property}" is not a valid message key. The key must start with a letter and contain only letters, numbers, or underscores.`, vscode.DiagnosticSeverity.Error);
                        }
                    }
                }
                if (metadataLevel === nestingLevel - 1 && property === 'placeholders') {
                    placeholderLevel = nestingLevel;
                }
            },
            onObjectEnd: (offset, length, startLine, startCharacter) => {
                nestingLevel--;
                if (placeholderLevel !== null && nestingLevel < placeholderLevel) {
                    placeholderLevel = null;
                    for (const placeholder of placeHoldersForKey.get(messageKey)) {
                        if (!definedPlaceholders.includes(placeholder.value)) {
                            showErrorAt(placeholder.start, placeholder.end, `Placeholder "${placeholder.value}" not defined in the message metadata.`, vscode.DiagnosticSeverity.Warning);
                        }
                    }
                    definedPlaceholders = [];
                }
                if (metadataLevel !== null && nestingLevel < metadataLevel) {
                    metadataLevel = -1;
                }
            },
        }, { disallowComments: true });
        this.diagnostics.set(editor.document.uri, diagnosticsList);
        decorationsMap.forEach((value, key) => {
            editor.setDecorations(key, value);
        });
        function decorateMessage(messageString, globalOffset, colorMap, editor, isOuter) {
            const vals = matchCurlyBrackets(messageString);
            for (const part of vals) {
                let localOffset = messageString.indexOf('{' + part + '}');
                if (selectRegex.exec(part) !== null) {
                    decorateComplexMessage(exports.selectDecoration, part, localOffset);
                }
                else if (pluralRegex.exec(part) !== null) {
                    decorateComplexMessage(exports.pluralDecoration, part, localOffset);
                }
                else {
                    const partOffset = globalOffset + localOffset + 2;
                    const partOffsetEnd = globalOffset + localOffset + part.length + 2;
                    if (isOuter) {
                        validateAndAddPlaceholder(part, partOffset, partOffsetEnd);
                    }
                    else {
                        decorateMessage(part, partOffset - 1, colorMap, editor, true);
                    }
                }
            }
            /**
            * Decorate ICU Message of type `select`, `plural`, or `gender`
            */
            function decorateComplexMessage(decoration, complexString, localOffset) {
                const firstComma = complexString.indexOf(',');
                const start = globalOffset + localOffset + 2;
                const end = globalOffset + localOffset + firstComma + 2;
                validateAndAddPlaceholder(complexString.substring(0, firstComma), start, end);
                const bracketedValues = matchCurlyBrackets(complexString);
                const secondComma = complexString.indexOf(',', firstComma + 1);
                localOffset = localOffset + secondComma + 1;
                for (const part of bracketedValues) {
                    const partWithBrackets = '{' + part + '}';
                    const indexOfPartInMessage = messageString.indexOf(partWithBrackets, localOffset);
                    decorateAt(globalOffset + localOffset + 2, globalOffset + indexOfPartInMessage + 1, decoration);
                    localOffset = indexOfPartInMessage + partWithBrackets.length;
                    decorateMessage(partWithBrackets, globalOffset + indexOfPartInMessage, colorMap, editor, false);
                }
            }
        }
        function validateAndAddPlaceholder(part, partOffset, partOffsetEnd) {
            if (placeholderNameRegex.exec(part) !== null) {
                placeHoldersForKey.get(messageKey).push(new Literal(part, partOffset, partOffsetEnd));
                decorateAt(partOffset, partOffsetEnd, exports.placeholderDecoration);
            }
            else {
                showErrorAt(partOffset, partOffsetEnd, `"${part}" is not a valid placeholder name. The key must start with a letter and contain only letters, numbers, underscores.`, vscode.DiagnosticSeverity.Error);
            }
        }
        function decorateAt(start, end, decoration) {
            const range = new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end));
            decorationsMap.get(decoration).push(range);
        }
        function showErrorAt(start, end, errorMessage, severity) {
            const range = new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end));
            diagnosticsList.push(new vscode.Diagnostic(range, errorMessage, severity));
        }
        return { diagnostics: diagnosticsList, decorations: decorationsMap };
    }
}
exports.DecoratorAndParser = DecoratorAndParser;
function matchCurlyBrackets(value) {
    return XRegExp.matchRecursive(value, '\\{', '\\}', 'g', {
        escapeChar: '\'',
        unbalanced: 'error'
    });
}
//# sourceMappingURL=parseAndDecorate.js.map