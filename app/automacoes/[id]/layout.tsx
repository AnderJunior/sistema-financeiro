export default function WorkflowBuilderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Este layout não precisa fazer nada, pois o LayoutWrapper já cuida de ocultar sidebar/topbar
  // Apenas garante que o conteúdo ocupe toda a tela
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {children}
    </div>
  )
}

