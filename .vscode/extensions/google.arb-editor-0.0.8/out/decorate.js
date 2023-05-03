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
exports.Decorator = exports.pluralDecoration = exports.selectDecoration = exports.placeholderDecoration = void 0;
const vscode = require("vscode");
const messageParser_1 = require("./messageParser");
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
class Decorator {
    decorate(editor, messageList) {
        // Prefill decorations map to avoid having old decoration hanging around
        let decorationsMap = new Map([
            [exports.placeholderDecoration, []],
            [exports.selectDecoration, []],
            [exports.pluralDecoration, []],
        ]);
        for (const entry of messageList?.messageEntries) {
            const hasMetadata = messageList.metadataEntries.filter((metadataEntry) => metadataEntry.key.value === ('@' + entry.key.value));
            let metadata = null;
            if (hasMetadata.length > 0) {
                metadata = hasMetadata[0].message;
            }
            decorateMessage(entry.message, metadata);
            decorateMetadata(entry.message, metadata);
        }
        decorationsMap.forEach((value, key) => {
            editor.setDecorations(key, value);
        });
        function decorateMessage(message, metadata) {
            if (message instanceof messageParser_1.CombinedMessage) {
                for (const submessage of message.parts) {
                    decorateMessage(submessage, metadata);
                }
            }
            else if (message instanceof messageParser_1.Placeholder) {
                decorateAt(message.start, message.end, exports.placeholderDecoration);
            }
            else if (message instanceof messageParser_1.ComplexMessage) {
                decorateAt(message.argument.start, message.argument.end, exports.placeholderDecoration);
                let complexDecoration = exports.selectDecoration;
                if (message.complexType.value.includes('plural')) {
                    complexDecoration = exports.pluralDecoration;
                }
                for (const [key, submessage] of message.messages.entries()) {
                    decorateAt(key.start, key.end, complexDecoration);
                    decorateMessage(submessage, metadata);
                }
            }
        }
        function decorateMetadata(message, metadata) {
            for (const placeholder of metadata?.placeholders ?? []) {
                decorateAt(placeholder.start, placeholder.end, exports.placeholderDecoration);
            }
        }
        function decorateAt(start, end, decoration) {
            const range = new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end));
            decorationsMap.get(decoration).push(range);
        }
        return decorationsMap;
    }
}
exports.Decorator = Decorator;
//# sourceMappingURL=decorate.js.map