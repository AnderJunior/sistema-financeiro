'use client'

import { memo } from 'react'
import { EdgeProps, getBezierPath } from 'reactflow'

interface AnimatedEdgeProps extends EdgeProps {
  data?: {
    isActive?: boolean
  }
}

export const AnimatedEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: AnimatedEdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isActive = data?.isActive || false

  return (
    <>
      {/* Edge principal */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: isActive ? 4 : 2,
          stroke: isActive ? '#3b82f6' : '#b1b1b7',
          transition: 'all 0.3s ease',
          filter: isActive ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))' : 'none'
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Animação quando ativo */}
      {isActive && (
        <>
          {/* Linha animada (efeito de "flow") */}
          <path
            style={{
              strokeWidth: 4,
              stroke: '#60a5fa',
              strokeDasharray: '8 8',
              strokeLinecap: 'round',
              fill: 'none',
              opacity: 0.8,
              animation: 'flowAnimation 0.8s linear infinite'
            }}
            d={edgePath}
          />
          
          {/* Partícula animada */}
          <circle
            r="5"
            fill="#3b82f6"
            style={{
              filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.8))',
              animation: 'particleAnimation 0.8s ease-in-out infinite'
            }}
          >
            <animateMotion dur="0.8s" repeatCount="indefinite" path={edgePath} />
          </circle>
          
          {/* Segunda partícula (atrasada) para efeito de fluxo contínuo */}
          <circle
            r="4"
            fill="#60a5fa"
            style={{
              opacity: 0.7,
              filter: 'drop-shadow(0 0 2px rgba(96, 165, 250, 0.6))'
            }}
          >
            <animateMotion dur="0.8s" repeatCount="indefinite" begin="0.4s" path={edgePath} />
          </circle>
          
          {/* Estilo global para animações */}
          <style>{`
            @keyframes flowAnimation {
              0% {
                stroke-dashoffset: 16;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
            
            @keyframes particleAnimation {
              0% {
                opacity: 0;
                r: 3;
              }
              50% {
                opacity: 1;
                r: 6;
              }
              100% {
                opacity: 0;
                r: 3;
              }
            }
          `}</style>
        </>
      )}
    </>
  )
})

AnimatedEdge.displayName = 'AnimatedEdge'

