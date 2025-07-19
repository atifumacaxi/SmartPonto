#!/bin/bash

echo "🚀 Iniciando deploy do SmartPonto..."

# Verificar se o .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando .env.example..."
    echo "SECRET_KEY=your-super-secret-key-here-change-this-in-production" > .env
    echo "REACT_APP_API_URL=http://localhost:8000" >> .env
    echo "📝 Por favor, edite o arquivo .env com suas configurações de produção"
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker compose down

# Remover imagens antigas
echo "🧹 Removendo imagens antigas..."
docker system prune -f

# Construir e iniciar containers de produção
echo "🔨 Construindo containers de produção..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Iniciando aplicação..."
docker compose -f docker-compose.prod.yml up -d

# Verificar status
echo "📊 Verificando status dos containers..."
docker compose -f docker-compose.prod.yml ps

echo "✅ Deploy concluído!"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend: http://localhost:8000"
echo "📚 Logs: docker compose -f docker-compose.prod.yml logs -f"
