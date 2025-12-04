export default function LicencaInvalidaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Licença Inválida ou Expirada
        </h1>
        
        <p className="text-gray-600 mb-6">
          Sua assinatura não está ativa ou expirou. Para continuar usando o sistema,
          é necessário renovar sua assinatura.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>O que fazer:</strong>
          </p>
          <ul className="text-sm text-yellow-700 mt-2 text-left list-disc list-inside space-y-1">
            <li>Verifique se sua assinatura está ativa</li>
            <li>Renove sua assinatura se necessário</li>
            <li>Entre em contato com o suporte se precisar de ajuda</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <a
            href="/login"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para Login
          </a>
          
          <button
            onClick={() => window.location.reload()}
            className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  )
}

