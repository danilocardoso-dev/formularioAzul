# Cadastro Azul Cargo

MVP web para registrar nome, telefone e empresa. Os dados são mantidos em `data/cadastros.json` e podem ser consultados ou baixados no painel administrativo.

## Rodar localmente

Requisitos: Node.js 18 ou superior.

```bash
npm install
npm start
```

Acesse:

- Formulário: `http://localhost:3000`
- Administração: `http://localhost:3000/admin`

Credenciais iniciais:

- Usuário: `admin`
- Senha: `AzulCargo@2026`

## Configuração recomendada para a VPS

Defina as variáveis abaixo no serviço, painel da hospedagem, Docker ou PM2. Os valores de `.env.example` são apenas uma referência; o servidor lê as variáveis do ambiente do sistema.

```env
PORT=3000
ADMIN_USER=seu-usuario
ADMIN_PASSWORD=uma-senha-forte
SESSION_SECRET=uma-frase-longa-aleatoria-e-secreta
```

Exemplo com PM2:

```bash
npm install --omit=dev
ADMIN_USER=seu-usuario ADMIN_PASSWORD='sua-senha' SESSION_SECRET='seu-segredo' pm2 start server.js --name cadastro-azul
pm2 save
```

Configure Nginx ou outro proxy reverso para encaminhar o domínio à porta 3000 e habilite HTTPS.

## Backup

Faça backup periódico de `data/cadastros.json`. Para poucos cadastros e uma única instância do processo, JSON é suficiente. Para múltiplas instâncias ou volume alto, migre para SQLite/PostgreSQL.

## Observação de marca

O visual usa uma paleta inspirada na Azul Cargo. Caso o sistema seja publicado oficialmente em nome da empresa, substitua a assinatura tipográfica pelo arquivo oficial da marca e valide as regras de uso.
