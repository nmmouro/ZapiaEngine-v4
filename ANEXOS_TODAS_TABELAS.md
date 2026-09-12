# Integração de Storage — demais tabelas

A integração de anexos foi generalizada para o Engine.

## Entidades com anexos

### Veículos
- foto
- crlv
- tag_foto
- foto_neo
- pontos_abastecimento
- manual_digital

### Empregados
- foto

### Abastecimento
- imagem

### Avarias
- vista_frontal
- vista_traseira
- vista_lateral_direita
- vista_lateral_esquerda
- vista_teto

### Manutenção
- imagem

## Padrão de armazenamento

Novos arquivos seguem:

`entidade/ID/campo/arquivo`

Exemplos:

`empregados/EMP000001/foto/20260912_...jpg`

`abastecimento/ABA000001/imagem/20260912_...jpg`

`avarias/AVA000001/vista_frontal/20260912_...jpg`

`manutencao/MAN000001/imagem/20260912_...jpg`

Os arquivos antigos de veículos no padrão `VEI000001/campo/arquivo` continuam compatíveis.

## Banco de dados

A tabela continua guardando somente a URL pública do arquivo.

## SQL

Execute:

`sql/storage_anexos_policies.sql`

no SQL Editor do Supabase antes de testar novos uploads.

## Limites

O Storage está configurado para até 20 MB por arquivo.

Os campos atualmente configurados pelo aplicativo usam normalmente 5 MB para foto de empregado e 10 MB para os demais anexos.
