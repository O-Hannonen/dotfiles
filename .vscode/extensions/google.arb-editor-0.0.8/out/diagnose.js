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
exports.Diagnostics = exports.DiagnosticCode = void 0;
const vscode = require("vscode");
const messageParser_1 = require("./messageParser");
const placeholderNameRegex = /^[a-zA-Z][a-zA-Z_$0-9]*$/; //Must be able to translate to a (non-private) Dart variable
const keyNameRegex = /^[a-zA-Z][a-zA-Z_0-9]*$/; //Must be able to translate to a (non-private) Dart method
var DiagnosticCode;
(function (DiagnosticCode) {
    DiagnosticCode[DiagnosticCode["mismatchedBrackets"] = 0] = "mismatchedBrackets";
    DiagnosticCode[DiagnosticCode["metadataForMissingKey"] = 1] = "metadataForMissingKey";
    DiagnosticCode[DiagnosticCode["invalidKey"] = 2] = "invalidKey";
    DiagnosticCode[DiagnosticCode["missingMetadataForKey"] = 3] = "missingMetadataForKey";
    DiagnosticCode[DiagnosticCode["invalidPlaceholder"] = 4] = "invalidPlaceholder";
    DiagnosticCode[DiagnosticCode["missingOtherInICU"] = 5] = "missingOtherInICU";
    DiagnosticCode[DiagnosticCode["unknownICUMessageType"] = 6] = "unknownICUMessageType";
    DiagnosticCode[DiagnosticCode["placeholderWithoutMetadata"] = 7] = "placeholderWithoutMetadata";
    DiagnosticCode[DiagnosticCode["missingPlaceholderWithMetadata"] = 8] = "missingPlaceholderWithMetadata";
})(DiagnosticCode = exports.DiagnosticCode || (exports.DiagnosticCode = {}));
class Diagnostics {
    constructor(context) {
        this.diagnostics = vscode.languages.createDiagnosticCollection("arb");
        context?.subscriptions.push(this.diagnostics);
    }
    diagnose(editor, messageList, errors) {
        let diagnosticsList = [];
        for (const error of errors) {
            showErrorAt(error.start, error.end, error.value, vscode.DiagnosticSeverity.Error, DiagnosticCode.mismatchedBrackets);
        }
        for (const entry of messageList?.messageEntries) {
            const hasMetadata = messageList.metadataEntries.filter((metadataEntry) => metadataEntry.key.value === ('@' + entry.key.value));
            let metadata = null;
            if (hasMetadata.length > 0) {
                metadata = hasMetadata[0].message;
            }
            validateKey(entry.key, metadata, messageList.isReference);
            validateMessage(entry.message, metadata);
            validateMetadata(entry.message, metadata);
        }
        for (const metadataKey of messageList?.metadataEntries.map((entry) => entry.key)) {
            const hasMessage = messageList.messageEntries.filter((messageEntry) => '@' + messageEntry.key.value === metadataKey.value);
            if (hasMessage.length === 0) {
                showErrorAt(metadataKey.start, metadataKey.end, `Metadata for an undefined key. Add a message key with the name "${metadataKey.value.substring(1)}".`, vscode.DiagnosticSeverity.Error, DiagnosticCode.metadataForMissingKey);
            }
        }
        this.diagnostics.set(editor.document.uri, diagnosticsList);
        function validateKey(key, metadata, isReference) {
            if (keyNameRegex.exec(key.value) === null) {
                showErrorAt(key.start, key.end, `Key "${key.value}" is not a valid message key. The key must start with a letter and contain only letters, numbers, or underscores.`, vscode.DiagnosticSeverity.Error, DiagnosticCode.invalidKey);
            }
            else {
                if (metadata === null && isReference) {
                    showErrorAt(key.start, key.end, `The message with key "${key.value}" does not have metadata defined.`, vscode.DiagnosticSeverity.Information, DiagnosticCode.missingMetadataForKey);
                }
            }
        }
        function validateMessage(message, metadata) {
            if (message instanceof messageParser_1.CombinedMessage) {
                for (const submessage of message.parts) {
                    validateMessage(submessage, metadata);
                }
            }
            else if (message instanceof messageParser_1.Placeholder) {
                validatePlaceholder(message, metadata);
            }
            else if (message instanceof messageParser_1.ComplexMessage) {
                validatePlaceholder(message.argument, metadata);
                if (!Array.from(message.messages.keys()).some((p) => p.value === 'other')) {
                    showErrorAt(message.start + 1, message.end + 1, `The ICU message format requires a 'other' argument.`, vscode.DiagnosticSeverity.Error, DiagnosticCode.missingOtherInICU);
                }
                if (!['plural', 'select', 'gender'].includes(message.complexType.value)) {
                    showErrorAt(message.complexType.start, message.complexType.end, `Unknown ICU messagetype "${message.complexType.value}"`, vscode.DiagnosticSeverity.Error, DiagnosticCode.unknownICUMessageType);
                }
                else {
                    for (const submessage of message.messages.values()) {
                        validateMessage(submessage, metadata);
                    }
                }
            }
        }
        function validatePlaceholder(placeholder, metadata) {
            if (placeholderNameRegex.exec(placeholder.value) !== null) {
                if (!metadata?.placeholders.some((p) => p.value === placeholder.value)) {
                    showErrorAt(placeholder.start, placeholder.end, `Placeholder "${placeholder.value}" not defined in the message metadata.`, vscode.DiagnosticSeverity.Warning, DiagnosticCode.placeholderWithoutMetadata);
                }
            }
            else {
                showErrorAt(placeholder.start, placeholder.end, `"${placeholder.value}" is not a valid placeholder name. The key must start with a letter and contain only letters, numbers, underscores.`, vscode.DiagnosticSeverity.Error, DiagnosticCode.invalidPlaceholder);
            }
        }
        function validateMetadata(message, metadata) {
            const placeholders = message.getPlaceholders();
            for (const placeholder of metadata?.placeholders ?? []) {
                if (!placeholders.some((p) => p.value === placeholder.value)) {
                    showErrorAt(placeholder.start, placeholder.end, `The placeholder is defined in the metadata, but not in the message.`, vscode.DiagnosticSeverity.Warning, DiagnosticCode.missingPlaceholderWithMetadata);
                }
            }
        }
        function showErrorAt(start, end, errorMessage, severity, code) {
            const range = new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end));
            const diagnostic = new vscode.Diagnostic(range, errorMessage, severity);
            diagnostic.code = code;
            diagnosticsList.push(diagnostic);
        }
        return diagnosticsList;
    }
}
exports.Diagnostics = Diagnostics;
//# sourceMappingURL=diagnose.js.map