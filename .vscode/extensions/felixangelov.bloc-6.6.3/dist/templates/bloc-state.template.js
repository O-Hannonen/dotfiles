"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlocStateTemplate = void 0;
const changeCase = require("change-case");
function getBlocStateTemplate(blocName, type) {
    switch (type) {
        case 2 /* Freezed */:
            return getFreezedBlocStateTemplate(blocName);
        case 1 /* Equatable */:
            return getEquatableBlocStateTemplate(blocName);
        default:
            return getDefaultBlocStateTemplate(blocName);
    }
}
exports.getBlocStateTemplate = getBlocStateTemplate;
function getEquatableBlocStateTemplate(blocName) {
    const pascalCaseBlocName = changeCase.pascalCase(blocName);
    const snakeCaseBlocName = changeCase.snakeCase(blocName);
    return `part of '${snakeCaseBlocName}_bloc.dart';

abstract class ${pascalCaseBlocName}State extends Equatable {
  const ${pascalCaseBlocName}State();
  
  @override
  List<Object> get props => [];
}

class ${pascalCaseBlocName}Initial extends ${pascalCaseBlocName}State {}
`;
}
function getDefaultBlocStateTemplate(blocName) {
    const pascalCaseBlocName = changeCase.pascalCase(blocName);
    const snakeCaseBlocName = changeCase.snakeCase(blocName);
    return `part of '${snakeCaseBlocName}_bloc.dart';

@immutable
abstract class ${pascalCaseBlocName}State {}

class ${pascalCaseBlocName}Initial extends ${pascalCaseBlocName}State {}
`;
}
function getFreezedBlocStateTemplate(blocName) {
    const pascalCaseBlocName = changeCase.pascalCase(blocName) + "State";
    const snakeCaseBlocName = changeCase.snakeCase(blocName);
    return `part of '${snakeCaseBlocName}_bloc.dart';

@freezed
class ${pascalCaseBlocName} with _\$${pascalCaseBlocName} {
  const factory ${pascalCaseBlocName}.initial() = _Initial;
}
`;
}
//# sourceMappingURL=bloc-state.template.js.map