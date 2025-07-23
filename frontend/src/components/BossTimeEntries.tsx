import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

interface TimeEntry {
  id: number;
  date: string;
  start_time: string;
  end_time: string | null;
  total_hours: number | null;
  is_confirmed: boolean;
  extracted_text: string | null;
  photo_path: string | null;
  created_at: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role_type: string;
  };
}

interface TimeEntriesResponse {
  total_entries: number;
  entries: TimeEntry[];
}

const BossTimeEntries: React.FC = () => {
  console.log('BossTimeEntries component loaded!');

  const { } = useAuth();
  const { hasPermission } = usePermissions();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<{[key: string]: string}>({});
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, alt: string} | null>(null);
  const [photoFitScreen, setPhotoFitScreen] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    confirmed_only: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  console.log('API_URL:', API_URL);
  console.log('VITE_API_URL env:', import.meta.env.VITE_API_URL);

  useEffect(() => {
    if (hasPermission('view_all_time_entries')) {
      fetchEntries();
    }
  }, [filters, hasPermission]);

  useEffect(() => {
    // Load photos for entries that have them
    console.log('useEffect triggered for photos');
    console.log('Entries:', entries.length);
    console.log('Photo URLs state:', photoUrls);

    entries.forEach(entry => {
      if (entry.photo_path && !photoUrls[entry.id]) {
        console.log(`Will load photo for entry ${entry.id}: ${entry.photo_path}`);
        loadPhoto(entry.photo_path, entry.id);
      }
    });
  }, [entries]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.confirmed_only) params.append('confirmed_only', filters.confirmed_only);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/time-entries?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }

      const data: TimeEntriesResponse = await response.json();
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleString('pt-BR');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };



    const loadPhoto = async (photoPath: string, entryId: number) => {
    if (!photoPath) return;

    try {
      const filename = photoPath.split('/').pop();
      if (!filename) return;

      console.log(`Loading photo for entry ${entryId}: ${filename}`);
      console.log(`URL: ${API_URL}/admin/photos/${filename}`);

      const token = localStorage.getItem('token');
      console.log(`Token: ${token ? 'Present' : 'Missing'}`);

      const response = await fetch(`${API_URL}/admin/photos/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response ok: ${response.ok}`);

      if (response.ok) {
        const blob = await response.blob();
        console.log(`Blob size: ${blob.size}`);
        const url = URL.createObjectURL(blob);
        console.log(`Created URL: ${url}`);
        setPhotoUrls(prev => ({ ...prev, [entryId]: url }));
      } else {
        console.error(`Failed to load photo: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error loading photo:', err);
    }
  };

  if (!hasPermission('view_all_time_entries')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Você não tem permissão para visualizar todas as entradas de tempo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Visualizar Entradas de Tempo - Boss
        </h2>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário ID
            </label>
            <input
              type="number"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filtrar por usuário"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.confirmed_only}
              onChange={(e) => setFilters({ ...filters, confirmed_only: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Confirmados</option>
              <option value="false">Pendentes</option>
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total de Entradas</p>
            <p className="text-2xl font-bold text-blue-900">{entries.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Confirmadas</p>
            <p className="text-2xl font-bold text-green-900">
              {entries.filter(e => e.is_confirmed).length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-900">
              {entries.filter(e => !e.is_confirmed).length}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Total de Horas</p>
            <p className="text-2xl font-bold text-purple-900">
              {entries.reduce((sum, e) => sum + (e.total_hours || 0), 0).toFixed(2)}h
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando entradas...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma entrada encontrada com os filtros aplicados.</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Informações do usuário */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                        {entry.user.full_name || entry.user.username}
                      </div>
                      <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                        {entry.user.email}
                      </div>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${
                        entry.is_confirmed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {entry.is_confirmed ? 'Confirmado' : 'Pendente'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Data:</span>
                        <span className="ml-2 text-gray-900">{formatDate(entry.date)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Início:</span>
                        <span className="ml-2 text-gray-900">{formatDateTime(entry.start_time)}</span>
                      </div>
                      {entry.end_time && (
                        <div>
                          <span className="font-medium text-gray-700">Fim:</span>
                          <span className="ml-2 text-gray-900">{formatDateTime(entry.end_time)}</span>
                        </div>
                      )}
                    </div>

                    {entry.total_hours && (
                      <div className="mt-2">
                        <span className="font-medium text-gray-700">Total de Horas:</span>
                        <span className="ml-2 text-blue-600 font-semibold">{entry.total_hours.toFixed(2)}h</span>
                      </div>
                    )}

                    {entry.extracted_text && (
                      <div className="mt-2">
                        <span className="font-medium text-gray-700">Texto Extraído:</span>
                        <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {entry.extracted_text}
                        </p>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                      Criado em: {formatDateTime(entry.created_at)}
                    </div>
                  </div>

                  {/* Foto */}
                  {entry.photo_path && (
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                        {photoUrls[entry.id] ? (
                          <img
                            src={photoUrls[entry.id]}
                            alt="Foto do ponto"
                            className="w-full h-full object-cover"
                            onClick={() => setSelectedPhoto({
                              url: photoUrls[entry.id],
                              alt: `Foto do ponto - ${entry.user.full_name || entry.user.username} - ${formatDate(entry.date)}`
                            })}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02NCAzMkM3My42NTY5IDMyIDgxLjMzMzMgMzkuNjc2NyA4MS4zMzMzIDQ5LjMzMzNDODEuMzMzMyA1OC45OSA3My42NTY5IDY2LjY2NjcgNjQgNjYuNjY2N0M1NC4zNDMxIDY2LjY2NjcgNDYuNjY2NyA1OC45OSA0Ni42NjY3IDQ5LjMzMzNDNDYuNjY2NyAzOS42NzY3IDU0LjM0MzEgMzIgNjQgMzJaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik02NCA3MkM0Ny40MzE1IDcyIDM0IDU4LjU2ODUgMzQgNDJDMzQgMjUuNDMxNSA0Ny40MzE1IDEyIDY0IDEyQzgwLjU2ODUgMTIgOTQgMjUuNDMxNSA5NCA0MkM5NCA1OC41Njg1IDgwLjU2ODUgNzIgNjQgNzJaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

                        {/* Modal para exibir foto em tamanho completo */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="relative max-w-6xl w-full">
                {/* Botões de controle */}
                <div className="fixed top-4 right-4 flex gap-2 z-10">
                  {/* Botão de redimensionar */}
                  <button
                    onClick={() => setPhotoFitScreen(!photoFitScreen)}
                    className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                    title={photoFitScreen ? "Tamanho real" : "Ajustar à tela"}
                  >
                    {photoFitScreen ? (
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16M4 20L20 4" />
                      </svg>
                    )}
                  </button>

                  {/* Botão de fechar */}
                  <button
                    onClick={() => {
                      setSelectedPhoto(null);
                      setPhotoFitScreen(false);
                    }}
                    className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Imagem */}
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.alt}
                    className={`transition-all duration-300 ${
                      photoFitScreen
                        ? 'w-full h-auto object-contain max-h-[80vh]'
                        : 'w-full h-auto max-w-none'
                    }`}
                    onClick={() => setPhotoFitScreen(!photoFitScreen)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                {/* Descrição */}
                <div className="mt-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
                  <p className="text-sm">{selectedPhoto.alt}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Clique na imagem para {photoFitScreen ? 'ver tamanho real' : 'ajustar à tela'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BossTimeEntries;
