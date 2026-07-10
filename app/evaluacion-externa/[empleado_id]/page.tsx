"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Award, 
  Loader2,
  Star,
  CheckCircle,
  User
} from "lucide-react"

interface Empleado {
  id: number
  nombre_completo: string
  identificacion: string
  cargo: string
  empresa: string
}

const criterios = [
  { key: "productividad", label: "Productividad", description: "Rendimiento y eficiencia en el trabajo" },
  { key: "puntualidad", label: "Puntualidad", description: "Cumplimiento de horarios y plazos" },
  { key: "trabajo_equipo", label: "Trabajo en Equipo", description: "Colaboracion con companeros" },
  { key: "comunicacion", label: "Comunicacion", description: "Claridad y efectividad al comunicarse" },
  { key: "iniciativa", label: "Iniciativa", description: "Proactividad y propuestas de mejora" },
]

export default function EvaluacionExternaPage({ params }: { params: Promise<{ empleado_id: string }> }) {
  const resolvedParams = use(params)
  const empleadoId = parseInt(resolvedParams.empleado_id)
  
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    evaluador: "",
    periodo: "",
    productividad: 5,
    puntualidad: 5,
    trabajo_equipo: 5,
    comunicacion: 5,
    iniciativa: 5,
    comentarios: "",
  })

  useEffect(() => {
    const loadEmpleado = async () => {
      try {
        const res = await fetch(`/api/rrhh/empleados/${empleadoId}`)
        const data = await res.json()
        if (data.success && data.data) {
          setEmpleado(data.data)
        } else {
          setError("Empleado no encontrado")
        }
      } catch (err) {
        setError("Error al cargar informacion del empleado")
      } finally {
        setLoading(false)
      }
    }
    
    if (empleadoId) {
      loadEmpleado()
    } else {
      setError("ID de empleado invalido")
      setLoading(false)
    }
  }, [empleadoId])

  const calcularPuntaje = () => {
    const total = form.productividad + form.puntualidad + form.trabajo_equipo + form.comunicacion + form.iniciativa
    return total / 5
  }

  const getCalificacion = (puntaje: number) => {
    if (puntaje >= 9) return "Excelente"
    if (puntaje >= 7) return "Bueno"
    if (puntaje >= 5) return "Regular"
    return "Deficiente"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.evaluador || !form.periodo) {
      setError("Por favor complete su nombre y el periodo de evaluacion")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const puntaje = calcularPuntaje()
      const res = await fetch("/api/rrhh/evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleado_id: empleadoId,
          evaluador: form.evaluador,
          periodo: form.periodo,
          productividad: form.productividad,
          puntualidad: form.puntualidad,
          trabajo_equipo: form.trabajo_equipo,
          comunicacion: form.comunicacion,
          iniciativa: form.iniciativa,
          comentarios: form.comentarios,
          puntaje_total: puntaje,
          calificacion: getCalificacion(puntaje),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSubmitted(true)
      } else {
        throw new Error(data.error || "Error al enviar evaluacion")
      }
    } catch (err: any) {
      setError(err.message || "No se pudo enviar la evaluacion")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="text-gray-600">Cargando...</span>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evaluacion Enviada con Exito</h1>
          <p className="text-gray-600">
            Gracias por completar la evaluacion de desempeno. Su respuesta ha sido registrada correctamente.
          </p>
        </Card>
      </div>
    )
  }

  if (error && !empleado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluacion de Desempeno</h1>
          <p className="text-gray-600 mt-1">Formulario de evaluacion externa</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Employee Info */}
          <Card className="mb-6 border-2 border-orange-200">
            <CardHeader className="pb-3 bg-orange-50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                Empleado a Evaluar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Nombre</p>
                  <p className="font-semibold text-gray-900">{empleado?.nombre_completo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Cargo</p>
                  <p className="font-medium text-gray-700">{empleado?.cargo || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Identificacion</p>
                  <p className="font-mono text-gray-700">{empleado?.identificacion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Empresa</p>
                  <p className="font-medium text-gray-700">{empleado?.empresa || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluator Info */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informacion del Evaluador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="evaluador">Su Nombre *</Label>
                  <Input
                    id="evaluador"
                    value={form.evaluador}
                    onChange={(e) => setForm({ ...form, evaluador: e.target.value })}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="periodo">Periodo de Evaluacion *</Label>
                  <Input
                    id="periodo"
                    value={form.periodo}
                    onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                    placeholder="Ej: Q1 2026, Marzo 2026"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Criteria */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Criterios de Evaluacion (1-10)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {criterios.map(criterio => (
                <div key={criterio.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{criterio.label}</Label>
                    <span className="text-lg font-bold text-orange-600">
                      {form[criterio.key as keyof typeof form]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{criterio.description}</p>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form[criterio.key as keyof typeof form] as number}
                    onChange={(e) => setForm({ ...form, [criterio.key]: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>1 - Deficiente</span>
                    <span>10 - Excelente</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Score Preview */}
          <Card className="mb-6 bg-gradient-to-r from-orange-100 to-amber-100 border-orange-200">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Puntaje Total</p>
              <p className="text-4xl font-bold text-orange-600">{calcularPuntaje().toFixed(1)}</p>
              <p className="text-lg font-semibold text-gray-700 mt-1">{getCalificacion(calcularPuntaje())}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Comentarios Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.comentarios}
                onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
                placeholder="Ingrese observaciones, fortalezas, areas de mejora..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Enviar Evaluacion
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Esta evaluacion es confidencial y sera procesada por el departamento de Recursos Humanos.
        </p>
      </div>
    </div>
  )
}
