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
exports.deactivate = exports.activate = void 0;
module.exports = {
    activate
};
let pendingDecorations;
const path = require("path");
const vscode = require("vscode");
const codeactions_1 = require("./codeactions");
const decorate_1 = require("./decorate");
const diagnose_1 = require("./diagnose");
const messageParser_1 = require("./messageParser");
const snippetsJson = require("../snippets/snippets.json");
const snippetsInlineJson = require("../snippets/snippets_inline.json");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
async function activate(context) {
    const decorator = new decorate_1.Decorator();
    const diagnostics = new diagnose_1.Diagnostics(context);
    const parser = new messageParser_1.Parser();
    const quickfixes = new codeactions_1.CodeActions();
    let commonMessageList;
    // decorate when changing the active editor editor
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => handleFile(editor), null, context.subscriptions));
    // decorate when the document changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => handleFile(vscode.window.activeTextEditor, true), null, context.subscriptions));
    const filePattern = { language: 'json', pattern: `**/*.arb` };
    // add quickfixes for diagnostics
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(filePattern, quickfixes, {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }));
    // Make the snippets available in arb files
    const completions = getSnippets(snippetsJson);
    const completionsStringInline = getSnippets(snippetsInlineJson);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(filePattern, {
        provideCompletionItems(document, position, token, context) {
            const messageTypeAtCursor = commonMessageList?.getMessageAt(document.offsetAt(position));
            if (messageTypeAtCursor instanceof messageParser_1.Literal) {
                return completionsStringInline;
            }
            else {
                return completions;
            }
        }
    }));
    // decorate the active editor now
    handleFile(vscode.window.activeTextEditor);
    function handleFile(editor, executeDelayed = false) {
        if (!editor || isNotArbFile(editor.document)) {
            return;
        }
        if (executeDelayed && pendingDecorations) {
            clearTimeout(pendingDecorations);
        }
        if (editor) {
            if (executeDelayed) {
                pendingDecorations = setTimeout(() => commonMessageList = parseAndDecorate(), 250);
            }
            else {
                commonMessageList = parseAndDecorate();
            }
        }
        function parseAndDecorate() {
            let [messageList, errors] = parser.parse(editor.document.getText());
            decorator.decorate(editor, messageList);
            diagnostics.diagnose(editor, messageList, errors);
            quickfixes.update(messageList);
            return messageList;
        }
    }
}
exports.activate = activate;
function isNotArbFile(document) {
    return document.languageId !== 'arb' && !path.basename(document.fileName).endsWith('.arb');
}
function getSnippets(snippetsJson) {
    const completions = new vscode.CompletionList();
    const snippets = snippetsJson;
    for (const snippetType of Object.keys(snippets)) {
        const snippet = snippets[snippetType];
        const completionItem = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
        completionItem.filterText = snippet.prefix;
        completionItem.insertText = new vscode.SnippetString(Array.isArray(snippet.body)
            ? snippet.body.join("\n")
            : snippet.body);
        completionItem.detail = snippet.description;
        completions.items.push(completionItem);
    }
    return completions;
}
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map