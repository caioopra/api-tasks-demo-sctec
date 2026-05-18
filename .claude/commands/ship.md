# /ship: testa, commita e abre PR

Faça nesta ordem:
1. Rode npm test e confirme que todos passam
2. Se passar, rode npm run lint:fix
3. Crie branch feature/<scope-descritivo> a partir do diff
4. Gere commit semântico baseado nos arquivos staged
5. Push da branch
6. Abra PR via gh com descrição baseada no diff
