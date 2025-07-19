# SmartPonto - Sistema de Controle de Ponto

Sistema completo de controle de ponto com captura de fotos, autenticação e dashboard administrativo.

## 🚀 Funcionalidades

- **Controle de Ponto**: Registro de entrada e saída com foto
- **Autenticação JWT**: Sistema seguro de login
- **Dashboard Admin**: Gerenciamento de usuários e visualização de entradas
- **Dashboard Boss**: Visualização de entradas de todos os usuários
- **Upload de Fotos**: Captura via webcam ou upload de arquivo
- **Visualização de Fotos**: Modal com zoom e redimensionamento
- **Controle de Acesso**: Sistema de roles (normal, boss, admin)

## 🛠️ Tecnologias

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS
- **Containerização**: Docker, Docker Compose
- **Autenticação**: JWT
- **Upload**: Webcam + File Upload

## 📋 Pré-requisitos

- Docker
- Docker Compose
- Git

## 🚀 Deploy Local

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd SmartPonto
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 3. Execute o deploy
```bash
# Deploy de desenvolvimento
docker compose up -d

# OU deploy de produção
./deploy.sh
```

### 4. Acesse a aplicação
- **Frontend**: http://localhost:3000 (dev) ou http://localhost (prod)
- **Backend**: http://localhost:8000

## 🔧 Configuração de Produção

### Variáveis de Ambiente

Crie um arquivo `.env` com as seguintes variáveis:

```env
# Backend
SECRET_KEY=sua-chave-secreta-super-segura
DATABASE_URL=postgresql://user:password@host:port/database

# Frontend
REACT_APP_API_URL=https://seu-dominio.com
```

### Deploy em Produção

1. **Configure o domínio** no arquivo `.env`
2. **Execute o script de deploy**:
   ```bash
   ./deploy.sh
   ```

## 👥 Usuários Padrão

### Admin
- **Email**: admin@smartponto.com
- **Senha**: admin123
- **Role**: admin

### Boss
- **Email**: boss@smartponto.com
- **Senha**: boss123
- **Role**: boss

### Usuário Normal
- **Email**: user@smartponto.com
- **Senha**: user123
- **Role**: normal

## 📁 Estrutura do Projeto

```
SmartPonto/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── routers/        # Endpoints da API
│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── schemas/        # Schemas Pydantic
│   │   └── uploads/        # Fotos enviadas
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # App React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── contexts/       # Contextos (Auth, Permissions)
│   │   └── types/          # Tipos TypeScript
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Configuração de desenvolvimento
├── docker-compose.prod.yml # Configuração de produção
└── deploy.sh              # Script de deploy
```

## 🔒 Segurança

- **JWT Authentication**: Tokens seguros com expiração
- **Role-based Access Control**: Controle de acesso por função
- **File Upload Security**: Validação de tipos de arquivo
- **Environment Variables**: Configurações sensíveis em variáveis de ambiente

## 📊 Monitoramento

### Logs
```bash
# Logs do frontend
docker compose logs frontend

# Logs do backend
docker compose logs backend

# Todos os logs
docker compose logs -f
```

### Status dos Containers
```bash
docker compose ps
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Fotos não carregam**
   - Verifique se a pasta `uploads` existe
   - Confirme as permissões de arquivo

2. **Erro de conexão com banco**
   - Verifique a `DATABASE_URL` no `.env`
   - Confirme se o banco está acessível

3. **Frontend não atualiza**
   - Limpe o cache do navegador
   - Reconstrua o container: `docker compose build frontend`

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request
