# Fitness2026 (iOS - Local SQLite)

App iOS para registrar treinos (Academia, Basquete e Outros) com banco SQLite local, calendário, exercícios sugeridos, sets/cargas, cardio (tempo/km), insights com gráficos e backup/import do banco.

## Requisitos
- iOS 16+
- Xcode 15+
- SwiftUI + Swift Charts
- SQLite via sqlite3 (sem dependências externas)

## Como rodar
1. Crie um projeto Xcode -> iOS App -> SwiftUI
2. Copie os arquivos deste repositório para dentro do projeto
3. Garanta que `libsqlite3.tbd` esteja linkada:
   - Target -> Build Phases -> Link Binary With Libraries -> + -> `libsqlite3.tbd`
4. Rode no simulador ou iPhone.

## Backup/Import
- Settings -> Export Database (gera arquivo .sqlite)
- Settings -> Import Database (substitui o banco atual)

> Import substitui os dados existentes (MVP).
