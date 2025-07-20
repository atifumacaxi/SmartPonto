#!/usr/bin/env python3
"""
Script para verificar e atualizar a estrutura do banco PostgreSQL
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

# Adicionar o diretório atual ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import DATABASE_URL

def check_database():
    """Verifica e atualiza a estrutura do banco de dados"""
    try:
        # Criar engine
        engine = create_engine(DATABASE_URL)

        # Verificar conexão
        with engine.connect() as conn:
            print("✅ Conexão com banco estabelecida")

            # Verificar se a tabela users existe
            inspector = inspect(engine)
            tables = inspector.get_table_names()

            if 'users' not in tables:
                print("❌ Tabela 'users' não encontrada")
                return False

            print("✅ Tabela 'users' encontrada")

            # Verificar colunas da tabela users
            columns = inspector.get_columns('users')
            column_names = [col['name'] for col in columns]

            print(f"📋 Colunas encontradas: {column_names}")

            # Verificar se role_type existe
            if 'role_type' not in column_names:
                print("⚠️  Coluna 'role_type' não encontrada. Adicionando...")

                # Adicionar coluna role_type
                with conn.begin():
                    conn.execute(text("ALTER TABLE users ADD COLUMN role_type VARCHAR DEFAULT 'normal'"))
                    print("✅ Coluna 'role_type' adicionada")
            else:
                print("✅ Coluna 'role_type' já existe")

            # Verificar se há usuários admin e boss
            result = conn.execute(text("SELECT email, role_type FROM users WHERE role_type IN ('admin', 'boss')"))
            admin_users = result.fetchall()

            if not admin_users:
                print("⚠️  Nenhum usuário admin ou boss encontrado")
                print("📝 Criando usuários padrão...")

                # Criar usuários padrão
                from app.auth import get_password_hash

                admin_password = get_password_hash("admin123")
                boss_password = get_password_hash("boss123")

                with conn.begin():
                    # Inserir admin
                    conn.execute(text("""
                        INSERT INTO users (email, username, hashed_password, full_name, role_type)
                        VALUES (:email, :username, :password, :full_name, :role_type)
                        ON CONFLICT (email) DO UPDATE SET role_type = :role_type
                    """), {
                        'email': 'admin@smartponto.com',
                        'username': 'admin',
                        'password': admin_password,
                        'full_name': 'Administrador',
                        'role_type': 'admin'
                    })

                    # Inserir boss
                    conn.execute(text("""
                        INSERT INTO users (email, username, hashed_password, full_name, role_type)
                        VALUES (:email, :username, :password, :full_name, :role_type)
                        ON CONFLICT (email) DO UPDATE SET role_type = :role_type
                    """), {
                        'email': 'boss@smartponto.com',
                        'username': 'boss',
                        'password': boss_password,
                        'full_name': 'Gerente',
                        'role_type': 'boss'
                    })

                    print("✅ Usuários admin e boss criados/atualizados")
            else:
                print(f"✅ {len(admin_users)} usuários admin/boss encontrados")
                for user in admin_users:
                    print(f"   - {user[0]} ({user[1]})")

            # Verificar outras tabelas
            required_tables = ['time_entries', 'monthly_targets']
            for table in required_tables:
                if table in tables:
                    print(f"✅ Tabela '{table}' encontrada")
                else:
                    print(f"⚠️  Tabela '{table}' não encontrada")

            return True

    except SQLAlchemyError as e:
        print(f"❌ Erro no banco de dados: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Verificando estrutura do banco de dados...")
    success = check_database()

    if success:
        print("\n✅ Verificação concluída com sucesso!")
    else:
        print("\n❌ Verificação falhou!")
        sys.exit(1)
