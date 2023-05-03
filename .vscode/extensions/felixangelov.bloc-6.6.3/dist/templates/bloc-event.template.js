"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlocEventTemplate = void 0;
const changeCase = require("change-case");
function getBlocEventTemplate(blocName, type) {
    switch (type) {
        case 2 /* Freezed */:
            return getFreezedBlocEvent(blocName);
        case 1 /* Equatable */:
            return getEquatableBlocEventTemplate(blocName);
        default:
            return getDefaultBlocEventTemplate(blocName);
    }
}
exports.getBlocEventTemplate = getBlocEventTemplate;
function getEquatableBlocEventTemplate(blocName) {
    const pascalCaseBlocName = changeCase.pascalCase(blocName);
    const snakeCaseBlocName = changeCase.snakeCase(blocName);
    return `part of '${snakeCaseBlocName}_bloc.dart';

abstract class ${pascalCaseBlocName}Event extends Equatable {
  const ${pascalCaseBlocName}Event();

  @override
  List<Object> get props => [];
}
`;
}
function getDefaultBlocEventTemplate(blocName) {
    const pascalCaseBlocName = changeCase.pascalCase(blocName);
    const snakeCaseBlocName = changeCase.snakeCase(blocName);
    return `part of '${snakeCaseBlocName}_bloc.dart';

@immutable
abstract class ${pascalCaseBlocName}Event {}
`;
}
function getFreezedBlocEvent(blocName) {
    const pascalCaseBlocName = changeCase.pascalCase(blocName) + "Event";
    const snakeCaseBlocName = changeCase.snakeCase(blocName);
    return `part of '${snakeCaseBlocName}_bloc.dart';

@freezed
class ${pascalCaseBlocName} with _\$${pascalCaseBlocName} {
  const factory ${pascalCaseBlocName}.started() = _Started;
}`;
}
//# sourceMappingURL=bloc-event.template.js.map