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
const path = require("path");
const test_electron_1 = require("@vscode/test-electron");
async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        // Download VS Code, unzip it and run the integration test
        await (0, test_electron_1.runTests)({ extensionDevelopmentPath, extensionTestsPath });
    }
    catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=runTest.js.map