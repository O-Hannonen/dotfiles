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
exports.CodeActions = void 0;
const vscode = require("vscode");
const diagnose_1 = require("./diagnose");
const messageParser_1 = require("./messageParser");
class CodeActions {
    update(messageList) {
        this.messageList = messageList;
    }
    provideCodeActions(document, range, context, token) {
        const diagnostics = context.diagnostics;
        const newMetadataActions = diagnostics
            .filter(diagnostic => diagnostic.code === diagnose_1.DiagnosticCode.missingMetadataForKey)
            .map(_ => this.createMetadataForKey(document, range));
        const undefinedPlaceholderActions = diagnostics
            .filter(diagnostic => diagnostic.code === diagnose_1.DiagnosticCode.placeholderWithoutMetadata)
            .map(_ => this.createPlaceholder(document, range));
        return [...newMetadataActions, ...undefinedPlaceholderActions]
            .filter(codeAction => codeAction instanceof vscode.CodeAction)
            .map(codeAction => codeAction);
    }
    createMetadataForKey(document, range) {
        const messageKey = this.messageList?.getMessageAt(document.offsetAt(range.start));
        const fix = new vscode.CodeAction(`Add metadata for key '${messageKey?.value}'`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, document.positionAt(messageKey?.endOfMessage ?? 0), `,\n${this.messageList?.getIndent()}"@${messageKey?.value}": {}`);
        return fix;
    }
    createPlaceholder(document, range) {
        const placeholder = this.messageList?.getMessageAt(document.offsetAt(range.start));
        var parent = placeholder?.parent;
        while (!(parent instanceof messageParser_1.MessageEntry)) {
            parent = parent?.parent;
        }
        const fix = new vscode.CodeAction(`Add metadata for placeholder '${placeholder?.value}'`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        const parentKey = parent.key;
        const metadataBlock = this.messageList?.metadataEntries.find((entry) => entry.key.value === '@' + parentKey.value);
        if (metadataBlock) {
            const metadata = metadataBlock.message;
            if (metadata.placeholders.length > 0) {
                const lastPlaceholderEnd = metadata.placeholders[metadata.placeholders.length - 1].objectEnd;
                fix.edit.insert(document.uri, document.positionAt(lastPlaceholderEnd), `,\n${this.messageList.getIndent(3)}"${placeholder?.value}": {}`);
            }
            else if (metadata.lastPlaceholderEnd) {
                fix.edit.insert(document.uri, document.positionAt(metadata.lastPlaceholderEnd), `\n${this.messageList.getIndent(3)}"${placeholder?.value}": {}\n${this.messageList.getIndent(2)}`);
            }
            else {
                const insertable = `\n${this.messageList.getIndent(2)}"placeholders": {\n${this.messageList.getIndent(3)}"${placeholder?.value}": {}\n${this.messageList.getIndent(2)}}\n${this.messageList.getIndent()}`;
                fix.edit.insert(document.uri, document.positionAt(metadata.metadataEnd), insertable);
            }
            return fix;
        }
        else {
            // TODO(mosuem): In this case, there is no metadata block yet. This could be handled by first running the fix for that, and then retrying this.
        }
    }
}
exports.CodeActions = CodeActions;
CodeActions.providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
];
//# sourceMappingURL=codeactions.js.map