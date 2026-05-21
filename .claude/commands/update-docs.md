Você vai atualizar a documentação do projeto com base nas 
mudanças mais recentes no código.

Passos:
1. Leia CLAUDE.md primeiro para entender padrões e estrutura
2. Rode `git diff main...HEAD --stat` para ver arquivos modificados
3. Para CADA arquivo modificado:
   - Se em src/routes/ → atualize README (seção API) e openapi.json
   - Se em src/services/ ou src/queue/ → atualize /docs/architecture.md
   - Se em src/schemas/ → atualize openapi.json
4. NÃO toque em arquivos de doc que não foram afetados
5. Se nenhuma mudança afeta doc, responda exatamente: 
   "Nenhuma documentação precisa de atualização."

Constraints:
- Respeite os padrões definidos em CLAUDE.md
- Mantenha o tom da doc existente
- Em diagramas Mermaid: adicione novos componentes, não recrie do zero
- No openapi.json: adicione novos paths, não remova existentes

Saída final:
- Resumo do que foi alterado em cada arquivo
- Diff dos arquivos modificados
