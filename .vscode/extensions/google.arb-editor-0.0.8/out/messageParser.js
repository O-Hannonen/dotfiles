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
exports.PlaceholderMetadata = exports.Placeholder = exports.ComplexMessage = exports.CombinedMessage = exports.Key = exports.Literal = exports.Message = exports.Metadata = exports.MessageEntry = exports.MessageList = exports.Parser = void 0;
const jsonc_parser_1 = require("jsonc-parser");
const XRegExp = require("xregexp");
class Parser {
    parse(document) {
        let isReference = false;
        const messages = [];
        const metadata = [];
        let nestingLevel = 0;
        let inReferenceTag = false;
        let placeholderLevel = null;
        let metadataLevel = null;
        let metadataKey = null;
        let messageKey = null;
        let definedPlaceholders = [];
        let errors = [];
        let indentation = null;
        let indentationCharacter = null;
        let totalPlaceholderEnd = null;
        (0, jsonc_parser_1.visit)(document, {
            onObjectBegin: (offset, length, startLine, startCharacter, pathSupplier) => {
                nestingLevel++;
            },
            onObjectProperty: (property, offset, length, startLine, startCharacter, pathSupplier) => {
                const key = new Key(property, offset + 1, offset + property.length + 1);
                if (placeholderLevel === nestingLevel - 1) {
                    definedPlaceholders.push(new PlaceholderMetadata(property, offset + 1, offset + property.length + 1));
                }
                if (nestingLevel === 1) {
                    indentation = startCharacter;
                    indentationCharacter = document.substring(offset - 1, offset);
                    const isMetadata = property.startsWith('@');
                    if (isMetadata) {
                        const isGlobalMetadata = property.startsWith('@@');
                        if (isGlobalMetadata) {
                            if (property === '@@x-reference') {
                                inReferenceTag = true;
                            }
                        }
                        else {
                            metadataKey = key;
                            metadataLevel = nestingLevel;
                        }
                    }
                    else {
                        messageKey = key;
                    }
                }
                if (metadataLevel === nestingLevel - 1 && property === 'placeholders') {
                    placeholderLevel = nestingLevel;
                }
            },
            onLiteralValue: (value, offset) => {
                if (inReferenceTag) {
                    isReference = (value === true);
                    inReferenceTag = false;
                }
                else if (nestingLevel === 1 && messageKey !== null) {
                    try {
                        var message = parseMessage(value, offset, false);
                        messages.push(new MessageEntry(messageKey, message));
                    }
                    catch (error) {
                        //Very hacky solution to catch all errors here and store them, but better than not checking at all... The error has no special type, unfortunately.
                        if (String(error).startsWith('Error: Unbalanced ')) {
                            errors.push(new Literal(String(error), offset + 1, offset + value.length + 1));
                        }
                        else {
                            throw error;
                        }
                    }
                    messageKey.endOfMessage = offset + value.length + 2;
                }
            },
            onObjectEnd: (offset, length, startLine, startCharacter) => {
                nestingLevel--;
                if (placeholderLevel !== null && nestingLevel === placeholderLevel + 1) {
                    definedPlaceholders[definedPlaceholders.length - 1].objectEnd = offset + length;
                }
                if (placeholderLevel !== null && nestingLevel === placeholderLevel) {
                    totalPlaceholderEnd = offset + length - 1;
                }
                if (metadataLevel !== null && nestingLevel <= metadataLevel) {
                    metadataLevel = -1;
                    metadata.push(new MessageEntry(metadataKey, new Metadata([...definedPlaceholders], offset, totalPlaceholderEnd ?? undefined)));
                    totalPlaceholderEnd = null;
                    definedPlaceholders = [];
                    metadataKey = null;
                }
            },
        }, { disallowComments: true });
        function parseMessage(messageString, globalOffset, expectPlaceholder) {
            const vals = matchCurlyBrackets(messageString);
            if (vals.length === 0) {
                if (expectPlaceholder) {
                    return new Placeholder(messageString, globalOffset, globalOffset + messageString.length);
                }
                else {
                    return new Literal(messageString, globalOffset, globalOffset + messageString.length);
                }
            }
            const submessages = [];
            for (const part of vals) {
                const isSubmessage = part.name === 'content';
                const isString = part.name === 'outside';
                if (isSubmessage || isString) {
                    if (isSubmessage && part.value.includes(',')) {
                        submessages.push(parseComplexMessage(part));
                    }
                    else {
                        submessages.push(parseMessage(part.value, globalOffset + part.start + 1, isSubmessage));
                    }
                }
            }
            if (submessages.length > 1) {
                return new CombinedMessage(globalOffset, globalOffset + messageString.length, submessages);
            }
            else {
                return submessages[0];
            }
            /**
            * Decorate ICU Message of type `select`, `plural`, or `gender`
            */
            function parseComplexMessage(part) {
                const submessages = new Map();
                const firstComma = part.value.indexOf(',');
                var start = globalOffset + part.start + 1;
                var end = globalOffset + part.start + firstComma + 1;
                const argument = new Literal(part.value.substring(0, firstComma), start, end);
                start = firstComma + 1;
                const secondComma = part.value.indexOf(',', start);
                end = secondComma;
                ({ start, end } = trim(part.value, start, end));
                const complexType = new Literal(part.value.substring(start, end), globalOffset + part.start + start + 1, globalOffset + part.start + end + 1);
                start = secondComma + 1;
                const bracketedValues = matchCurlyBrackets(part.value);
                for (const innerPart of bracketedValues) {
                    if (innerPart.name === 'content') {
                        end = innerPart.start - 1;
                        ({ start, end } = trim(part.value, start, end));
                        var submessagekey = new Literal(part.value.substring(start, end), globalOffset + part.start + start + 1, globalOffset + part.start + end + 1);
                        var message = parseMessage(innerPart.value, globalOffset + part.start + innerPart.start, false);
                        submessages.set(submessagekey, message);
                        start = innerPart.end + 1;
                    }
                }
                return new ComplexMessage(globalOffset + part.start, globalOffset + part.end, argument, complexType, submessages);
            }
            function trim(text, start, end) {
                while (text.charAt(start) === ' ') {
                    start++;
                }
                while (text.charAt(end - 1) === ' ') {
                    end--;
                }
                return { start, end };
            }
        }
        return [new MessageList(isReference, indentation ?? 0, indentationCharacter ?? ' ', messages, metadata), errors];
    }
}
exports.Parser = Parser;
function matchCurlyBrackets(value) {
    return XRegExp.matchRecursive(value, '\\{', '\\}', 'g', {
        valueNames: ['outside', 'leftBracket', 'content', 'rightBracket'],
        escapeChar: '\'',
        unbalanced: 'error'
    });
}
class MessageList {
    constructor(isReference, indentationCount, // The number of indentation characters used for indenting, for example 2 spaces or 1 tab
    indentationCharacter, // The indentation character used, most commonly either a space or a tab
    messageEntries, metadataEntries) {
        this.isReference = isReference;
        this.indentationCount = indentationCount;
        this.indentationCharacter = indentationCharacter;
        this.messageEntries = messageEntries;
        this.metadataEntries = metadataEntries;
    }
    getPlaceholders() {
        return this.messageEntries.flatMap((messageEntry) => messageEntry.message.getPlaceholders());
    }
    getIndent(indentLevel) {
        return this.indentationCharacter.repeat((this.indentationCount ?? 0) * (indentLevel ?? 1));
    }
    getMessageAt(offset) {
        return [...this.messageEntries, ...this.metadataEntries]
            .flatMap((entry) => [entry.key, entry.message])
            .map((message) => message.whereIs(offset))
            .find((whereIs) => whereIs !== null) ?? null;
    }
}
exports.MessageList = MessageList;
class MessageEntry {
    constructor(key, message) {
        this.key = key;
        this.message = message;
        message.parent = this;
    }
}
exports.MessageEntry = MessageEntry;
class Metadata {
    constructor(placeholders, metadataEnd, lastPlaceholderEnd, parent) {
        this.placeholders = placeholders;
        this.metadataEnd = metadataEnd;
        this.lastPlaceholderEnd = lastPlaceholderEnd;
        this.parent = parent;
    }
    whereIs(offset) {
        return this.placeholders
            .map((placeholder) => placeholder.whereIs(offset))
            .find((whereIs) => whereIs !== null) ?? null;
    }
}
exports.Metadata = Metadata;
class Message {
    constructor(start, end, parent) {
        this.start = start;
        this.end = end;
        this.parent = parent;
    }
}
exports.Message = Message;
class Literal extends Message {
    constructor(value, start, end, parent) {
        super(start, end, parent);
        this.value = value;
        this.start = start;
        this.end = end;
        this.toString = () => {
            return `Literal(${this.value},${this.start},${this.end})`;
        };
    }
    whereIs(offset) {
        if (this.start < offset && offset < this.end) {
            return this;
        }
        else {
            return null;
        }
    }
    getPlaceholders() {
        return [];
    }
}
exports.Literal = Literal;
class Key extends Literal {
    getPlaceholders() {
        throw new Error('Method not implemented.');
    }
    constructor(value, start, end, parent) {
        super(value, start, end, parent);
    }
}
exports.Key = Key;
class CombinedMessage extends Message {
    constructor(start, end, parts, parent) {
        super(start, end, parent);
        this.parts = parts;
        for (const part of parts) {
            part.parent = this;
        }
    }
    getPlaceholders() {
        return this.parts.flatMap((value) => value.getPlaceholders());
    }
    whereIs(offset) {
        if (this.start < offset && offset < this.end) {
            return this.parts
                .map((part) => part.whereIs(offset))
                .find((whereIs) => whereIs !== null) ?? this;
        }
        return null;
    }
}
exports.CombinedMessage = CombinedMessage;
class ComplexMessage extends Message {
    constructor(start, end, argument, complexType, messages, parent) {
        super(start, end, parent);
        this.argument = argument;
        this.complexType = complexType;
        this.messages = messages;
        argument.parent = this;
        complexType.parent = this;
        for (const [_, message] of messages) {
            message.parent = this;
        }
    }
    getPlaceholders() {
        return [this.argument, ...Array.from(this.messages.values()).flatMap((value) => value.getPlaceholders())];
    }
    whereIs(offset) {
        if (this.start < offset && offset < this.end) {
            return Array.from(this.messages.entries())
                .flatMap(([literal, message]) => [literal, message])
                .map((part) => part.whereIs(offset))
                .find((whereIs) => whereIs !== null) ?? null;
        }
        return null;
    }
}
exports.ComplexMessage = ComplexMessage;
class Placeholder extends Literal {
    constructor(value, start, end, parent) {
        super(value, start, end, parent);
    }
    getPlaceholders() {
        return [this];
    }
    whereIs(offset) {
        if (this.start < offset && offset < this.end) {
            return this;
        }
        else {
            return null;
        }
    }
}
exports.Placeholder = Placeholder;
class PlaceholderMetadata extends Message {
    constructor(value, start, end, parent) {
        super(start, end, parent);
        this.value = value;
        this.start = start;
        this.end = end;
        this.toString = () => {
            return `Literal(${this.value},${this.start},${this.end})`;
        };
    }
    whereIs(offset) {
        if (this.start < offset && offset < this.end) {
            return this;
        }
        else {
            return null;
        }
    }
    getPlaceholders() {
        return [];
    }
}
exports.PlaceholderMetadata = PlaceholderMetadata;
//# sourceMappingURL=messageParser.js.map